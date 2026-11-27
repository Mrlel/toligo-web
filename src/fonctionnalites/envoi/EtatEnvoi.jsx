import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { confirmerCommande, creerCommande, devisCommande, remplacerCommande } from './api';

/**
 * Tout ce que le client saisit dans le parcours « Nouvel envoi », partagé par
 * ses écrans (comme etat_envoi.dart).
 *
 * Mise à jour du 26/11/2026 : le client n'indique plus que le NOMBRE de colis.
 * Le gestionnaire de l'entrepôt les pèse et les mesure au comptoir : c'est là
 * que le format et le prix réel sont fixés, et l'expéditeur les accepte sur
 * place. Dans l'application, le prix n'est qu'une estimation tirée
 * de la grille des formats.
 *
 * Le brouillon n'est créé sur le serveur qu'en quittant l'étape « Réception »,
 * car le mode de réception fait partie de la commande. En attendant, la saisie
 * est gardée dans l'onglet du navigateur (sessionStorage) : elle survit à un
 * rechargement de la page.
 *
 * Forme du brouillon :
 * - collecte : adresse de l'expéditeur, prise dans le carnet (voir adresses/api.js) ;
 * - destinataires : [{ cle, nom, telephone, lieu, adresse, repere }], un seul au plus ;
 * - nbColis : nombre de colis annoncé (1 à NB_MAX_COLIS) ;
 * - instructions : consignes pour la livraison au destinataire ;
 * - depot : entrepôt de dépôt choisi { site }, ou null (Tôligo choisit) ;
 * - modeReception : `retrait_station`, `livraison_domicile` ou `box_stockage` ;
 * - commande : brouillon créé sur le serveur (null avant l'étape « Réception ») ;
 * - envoye : dernière saisie envoyée au serveur (texte JSON), pour ne pas la
 *   renvoyer quand rien n'a changé ;
 * - devis : grille indicative et estimation calculées par le serveur ;
 * - modeReglement : `sur_place` (l'expéditeur paie au dépôt) ou
 *   `a_la_livraison` (le destinataire paie à la remise).
 */
const ContexteEnvoi = createContext(null);

// Clé propre au parcours du 26/11/2026 : un brouillon de l'ancien parcours
// (formats choisis par le client, paiement en ligne) n'est pas repris.
const CLE_STOCKAGE = 'toligo_envoi_v34';

/** Garde-fou du serveur : au-delà, une commande relève de l'import par fichier. */
export const NB_MAX_COLIS = 50;

const BROUILLON_VIDE = {
  collecte: null,
  instructions: '',
  destinataires: [],
  nbColis: 1,
  depot: null,
  modeReception: 'retrait_station',
  commande: null,
  envoye: null,
  devis: null,
  modeReglement: 'sur_place',
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

/**
 * Fourchette indicative avant le devis du serveur : tous les colis au plus
 * petit format, ou tous au plus grand. Hors supplément du mode de réception.
 *
 * @param {Array<{prix: number}>} formats Formats actifs.
 * @returns {{min: number, max: number} | null}
 */
export function fourchetteDesFormats(formats, nbColis) {
  const prixListe = (formats ?? []).map((f) => f.prix).filter((p) => p > 0);
  if (prixListe.length === 0) return null;
  return { min: nbColis * Math.min(...prixListe), max: nbColis * Math.max(...prixListe) };
}

/** Rang d'un destinataire dans l'envoi (0, 1...) : il fixe la couleur de son avatar. */
export function rangDestinataire(brouillon, nom) {
  const rang = brouillon.destinataires.findIndex((d) => d.nom === nom);
  return rang < 0 ? 0 : rang;
}

/** Étapes affichées en haut du parcours. */
export function etapesEnvoi() {
  return ['Trajet', 'Colis', 'Dépôt', 'Remise', 'Valider'];
}

/** Corps de POST /client/commandes : destinataire, mode et nombre de colis. */
function versApi(brouillon) {
  const destinataire = brouillon.destinataires[0];
  return {
    source: 'application',
    adresse_collecte_id: brouillon.collecte.id,
    // §9.1 : seul l'entrepôt est choisi, le serveur en déduit la station de
    // départ. Nul quand l'expéditeur laisse Tôligo choisir.
    entrepot_depot_id: brouillon.depot?.site?.id ?? null,
    mode_reception: brouillon.modeReception,
    destinataire_nom: destinataire.nom,
    destinataire_telephone: destinataire.telephone,
    livraison_adresse: destinataire.adresse,
    livraison_repere: destinataire.repere || null,
    livraison_latitude: destinataire.lieu.latitude,
    livraison_longitude: destinataire.lieu.longitude,
    livraison_instructions: brouillon.instructions.trim() || null,
    nb_colis: brouillon.nbColis,
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

  const actions = {
    reinitialiser: () => setBrouillon(BROUILLON_VIDE),

    // L'adresse d'expédition commande la liste des entrepôts : le lieu de dépôt
    // choisi pour l'ancienne adresse n'a plus de sens.
    choisirCollecte: (adresse) => modifier({ collecte: adresse, depot: null }),

    /** Lieu de dépôt retenu (§9.1), ou `null` pour laisser Tôligo choisir. */
    choisirDepot: (depot) => modifier({ depot }),

    definirInstructions: (texte) => modifier({ instructions: texte }),

    /** Nombre de colis annoncé, borné entre 1 et NB_MAX_COLIS. */
    definirNbColis: (nombre) => modifier({ nbColis: Math.min(NB_MAX_COLIS, Math.max(1, Math.round(nombre) || 1)) }),

    /** Définit le destinataire (un seul par commande). */
    ajouterDestinataire: ({ nom, telephone, lieu, adresse, repere }) =>
      setBrouillon((b) => ({
        ...b,
        prochaineCle: b.prochaineCle + 1,
        destinataires: [{ cle: b.prochaineCle, nom, telephone, lieu, adresse, repere: repere ?? null }],
      })),

    modifierDestinataire: (index, changements) =>
      setBrouillon((b) => ({ ...b, destinataires: b.destinataires.map((d, i) => (i === index ? { ...d, ...changements } : d)) })),

    retirerDestinataire: (index) => setBrouillon((b) => ({ ...b, destinataires: b.destinataires.filter((_, i) => i !== index) })),

    choisirModeReception: (mode) => modifier({ modeReception: mode }),

    /**
     * Crée le brouillon sur le serveur, ou le remplace s'il existe déjà, puis
     * charge le devis indicatif (station B, grille des formats, supplément du
     * mode de réception). Rien n'est renvoyé si la saisie n'a pas changé.
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

    choisirModeReglement: (mode) => modifier({ modeReglement: mode }),

    /** Confirme l'envoi : le serveur émet le code de dépôt, valable 48 h. */
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
