import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { confirmerCommande, creerCommande, devisCommande, remplacerCommande } from './api';

/**
 * Tout ce que le client saisit dans le parcours « Nouvel envoi », partagé par
 * ses écrans (comme etat_envoi.dart).
 *
 * Workflow V3.3 : un seul destinataire par commande, un mode de réception
 * pour toute la commande, et des stations choisies par Tôligo. Le brouillon
 * n'est créé sur le serveur qu'en quittant l'étape « Réception », car le mode
 * de réception fait partie de la commande. En attendant, la saisie est gardée
 * dans l'onglet du navigateur (sessionStorage) : elle survit à un
 * rechargement de la page.
 *
 * Forme du brouillon :
 * - collecte : adresse de l'expéditeur, prise dans le carnet (voir adresses/api.js) ;
 * - destinataires : [{ cle, nom, telephone, lieu, adresse, repere, colis: [...] }],
 *   un seul élément au plus ; chaque colis : { cle, format, description, fragile } ;
 * - instructions : consignes pour la livraison au destinataire ;
 * - modeReception : `retrait_station`, `livraison_domicile` ou `box_stockage` ;
 * - commande : brouillon créé sur le serveur (null avant l'étape 3) ;
 * - envoye : dernière saisie envoyée au serveur (texte JSON), pour ne pas
 *   recréer les colis — et perdre leurs photos — quand rien n'a changé ;
 * - devis : station B et prix calculés par le serveur ;
 * - modeReglement : `en_ligne` ou `a_la_livraison`.
 */
const ContexteEnvoi = createContext(null);

// Clé propre au workflow V3.3 : un brouillon de l'ancien parcours (plusieurs
// destinataires, choix de station) n'est pas repris.
const CLE_STOCKAGE = 'toligo_envoi_v33';

const BROUILLON_VIDE = {
  collecte: null,
  instructions: '',
  destinataires: [],
  modeReception: 'retrait_station',
  commande: null,
  envoye: null,
  devis: null,
  modeReglement: 'en_ligne',
  prochaineCle: 1,
};

function lireBrouillon() {
  try {
    const texte = sessionStorage.getItem(CLE_STOCKAGE);
    return texte ? { ...BROUILLON_VIDE, ...JSON.parse(texte) } : BROUILLON_VIDE;
  } catch {
    return BROUILLON_VIDE;
  }
}

// --- Lectures utiles aux écrans ---

export function tousLesColis(brouillon) {
  return brouillon.destinataires.flatMap((d) => d.colis);
}

export function colisEstComplet(colis) {
  return Boolean(colis.format) && colis.description.trim() !== '';
}

export function colisComplets(brouillon) {
  const colis = tousLesColis(brouillon);
  return colis.length > 0 && colis.every(colisEstComplet);
}

/**
 * Total indicatif des formats, avant le devis. Le serveur recalcule toujours
 * le montant définitif.
 */
export function totalIndicatif(brouillon) {
  return tousLesColis(brouillon).reduce((total, c) => total + (c.format?.prix ?? 0), 0);
}

/** Rang d'un destinataire dans l'envoi (0, 1...) : il fixe la couleur de son avatar. */
export function rangDestinataire(brouillon, nom) {
  const rang = brouillon.destinataires.findIndex((d) => d.nom === nom);
  return rang < 0 ? 0 : rang;
}

/** Étapes affichées en haut du parcours. */
export function etapesEnvoi() {
  return ['Adresses', 'Colis', 'Réception', 'Paiement'];
}

/** Corps de POST /client/commandes : destinataire et mode portés par la commande. */
function versApi(brouillon) {
  const destinataire = brouillon.destinataires[0];
  return {
    source: 'application',
    adresse_collecte_id: brouillon.collecte.id,
    mode_reception: brouillon.modeReception,
    destinataire_nom: destinataire.nom,
    destinataire_telephone: destinataire.telephone,
    livraison_adresse: destinataire.adresse,
    livraison_repere: destinataire.repere || null,
    livraison_latitude: destinataire.lieu.latitude,
    livraison_longitude: destinataire.lieu.longitude,
    livraison_instructions: brouillon.instructions.trim() || null,
    colis: destinataire.colis.map((colis) => ({
      description: colis.description.trim(),
      format_colis_id: colis.format.id,
      est_fragile: colis.fragile,
    })),
  };
}

export function FournisseurEnvoi({ children }) {
  const [brouillon, setBrouillon] = useState(lireBrouillon);

  // Les actions asynchrones lisent toujours le brouillon le plus récent.
  const actuel = useRef(brouillon);
  actuel.current = brouillon;

  useEffect(() => {
    try {
      sessionStorage.setItem(CLE_STOCKAGE, JSON.stringify(brouillon));
    } catch {
      // Sans stockage, la saisie sera perdue au rechargement : sans gravité.
    }
  }, [brouillon]);

  const modifier = useCallback((changements) => setBrouillon((b) => ({ ...b, ...changements })), []);

  /** Remplace la liste des destinataires à partir de la précédente. */
  const modifierDestinataires = useCallback(
    (transformer) => setBrouillon((b) => ({ ...b, destinataires: transformer(b.destinataires) })),
    [],
  );

  const actions = {
    reinitialiser: () => setBrouillon(BROUILLON_VIDE),

    choisirCollecte: (adresse) => modifier({ collecte: adresse }),

    definirInstructions: (texte) => modifier({ instructions: texte }),

    /** Définit le destinataire, avec un premier colis à décrire. */
    ajouterDestinataire: ({ nom, telephone, lieu, adresse, repere }) =>
      setBrouillon((b) => ({
        ...b,
        prochaineCle: b.prochaineCle + 2,
        destinataires: [
          {
            cle: b.prochaineCle,
            nom,
            telephone,
            lieu,
            adresse,
            repere: repere ?? null,
            colis: [{ cle: b.prochaineCle + 1, format: null, description: '', fragile: false }],
          },
        ],
      })),

    modifierDestinataire: (index, changements) =>
      modifierDestinataires((liste) => liste.map((d, i) => (i === index ? { ...d, ...changements } : d))),

    retirerDestinataire: (index) => modifierDestinataires((liste) => liste.filter((_, i) => i !== index)),

    /** Ajoute un colis, déjà décrit, au destinataire (écran « Ajouter un colis »). */
    ajouterColis: (indexDestinataire, { format, description, fragile }) =>
      setBrouillon((b) => ({
        ...b,
        prochaineCle: b.prochaineCle + 1,
        destinataires: b.destinataires.map((d, i) =>
          i === indexDestinataire ? { ...d, colis: [...d.colis, { cle: b.prochaineCle, format, description, fragile }] } : d,
        ),
      })),

    modifierColis: (indexDestinataire, indexColis, changements) =>
      modifierDestinataires((liste) =>
        liste.map((d, i) =>
          i === indexDestinataire ? { ...d, colis: d.colis.map((c, j) => (j === indexColis ? { ...c, ...changements } : c)) } : d,
        ),
      ),

    retirerColis: (indexDestinataire, indexColis) =>
      modifierDestinataires((liste) =>
        liste.map((d, i) => (i === indexDestinataire ? { ...d, colis: d.colis.filter((_, j) => j !== indexColis) } : d)),
      ),

    choisirModeReception: (mode) => modifier({ modeReception: mode }),

    /**
     * Crée le brouillon sur le serveur, ou le remplace s'il existe déjà, puis
     * charge le devis (station B, supplément du mode de réception).
     *
     * Le remplacement recrée les colis, sans leurs photos : il n'a donc lieu
     * que si la saisie a changé depuis le dernier envoi.
     */
    enregistrerBrouillon: async () => {
      const b = actuel.current;
      const donnees = versApi(b);
      const envoye = JSON.stringify(donnees);
      const existante = b.commande && b.commande.statut === 'brouillon' ? b.commande : null;
      if (existante && b.devis && b.envoye === envoye) return existante;

      const commande = existante ? await remplacerCommande(existante.id, donnees) : await creerCommande(donnees);
      const devis = await devisCommande(commande.id);
      modifier({ commande, devis, envoye });
      return commande;
    },

    /** Note qu'un colis du brouillon a sa photo sur le serveur. */
    marquerPhoto: (codeSuivi) =>
      setBrouillon((b) => ({
        ...b,
        commande: b.commande && {
          ...b.commande,
          colis: b.commande.colis.map((c) => (c.codeSuivi === codeSuivi ? { ...c, aUnePhoto: true } : c)),
        },
      })),

    choisirModeReglement: (mode) => modifier({ modeReglement: mode }),

    /** Confirme la commande avec le mode de règlement choisi. */
    confirmer: async () => {
      const b = actuel.current;
      const commande = await confirmerCommande(b.commande.id, { modeReglement: b.modeReglement });
      modifier({ commande });
      return commande;
    },
  };

  return <ContexteEnvoi.Provider value={{ brouillon, ...actions }}>{children}</ContexteEnvoi.Provider>;
}

/** `const { brouillon, ajouterDestinataire, ... } = useEnvoi();` */
export function useEnvoi() {
  return useContext(ContexteEnvoi);
}
