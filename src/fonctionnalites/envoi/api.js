import { api } from '../../api/client';
import { versFormatResume } from '../../commun/formats';
import { lireBooleen, lireDate, lireListe, lireNombre, lireObjet } from '../../utils/lecture';
import { versCommune } from '../adresses/api';

/**
 * Appels d'API du parcours de commande (workflow V3.3) :
 * brouillon -> devis -> confirmation -> paiement.
 *
 * Le destinataire et le mode de réception sont portés par la commande (un
 * seul destinataire par commande). Les stations sont choisies par Tôligo.
 */

/** Modes de réception proposés à l'expéditeur, pour toute la commande. */
export const MODES_RECEPTION = [
  {
    code: 'retrait_station',
    libelle: 'Retrait en station',
    detail: 'Le destinataire vient chercher le colis à la station Tôligo la plus proche de chez lui.',
  },
  {
    code: 'livraison_domicile',
    libelle: 'Livraison à domicile',
    detail: 'Un livreur Tôligo apporte le colis. Supplément selon la distance.',
  },
  {
    code: 'box_stockage',
    libelle: 'Box de stockage',
    detail: 'Le colis est déposé dans un box ; le destinataire reçoit un code. Supplément de location.',
  },
];

export function libelleModeReception(code) {
  return MODES_RECEPTION.find((m) => m.code === code)?.libelle ?? '';
}

/** Station résumée (nom, adresse, coordonnées). */
function versStation(json) {
  if (!json || typeof json !== 'object') return null;
  return {
    id: json.id,
    nom: json.nom ?? '',
    adresse: json.adresse ?? null,
    latitude: lireNombre(json.latitude),
    longitude: lireNombre(json.longitude),
  };
}

/** Colis d'une commande, tel que l'API le renvoie. */
function versColisCommande(json) {
  const box = json.box && typeof json.box === 'object' ? json.box : null;
  const code = json.code_depot && typeof json.code_depot === 'object' ? json.code_depot : null;
  return {
    id: json.id,
    codeSuivi: json.code_suivi ?? '',
    statut: json.statut ?? '',
    description: json.description ?? '',
    format: versFormatResume(json.format),
    prix: lireNombre(json.prix) ?? 0,
    // Photo exigée avant la confirmation (§11.2).
    aUnePhoto: lireBooleen(json.a_une_photo),
    // Box de réception où déposer le colis, et son code à usage unique.
    box: box && { numero: box.numero ?? '', adresse: box.adresse ?? null },
    codeDepot: code && {
      code: code.code ?? null,
      statut: code.statut ?? '',
      expireLe: lireDate(code.expire_le),
      utiliseLe: lireDate(code.utilise_le),
    },
    deposeLe: lireDate(json.depose_le),
  };
}

/** Commande de livraison (brouillon, puis confirmée). */
export function versCommande(json) {
  const collecte = lireObjet(json.collecte);
  const destinataire = lireObjet(json.destinataire);
  const livraison = lireObjet(json.livraison);
  const mode = json.mode_reception && typeof json.mode_reception === 'object' ? json.mode_reception : null;
  const paiement = json.paiement && typeof json.paiement === 'object' ? json.paiement : null;
  const commande = {
    id: json.id,
    reference: json.reference ?? '',
    statut: json.statut ?? '',
    montantBase: lireNombre(json.montant_base) ?? 0,
    montantSupplement: lireNombre(json.montant_supplement) ?? 0,
    montantTotal: lireNombre(json.montant_total) ?? 0,
    montantDefinitif: lireBooleen(json.montant_definitif),
    modeReglement: json.mode_reglement ?? null,
    modeReception: mode?.code ?? null,
    stationDepart: versStation(json.station_depart),
    stationArrivee: versStation(json.station_arrivee),
    // Adresse de l'expediteur (colonnes `collecte_*` cote serveur).
    expediteurAdresse: collecte.adresse ?? null,
    expediteurNom: collecte.nom_contact ?? null,
    expediteurCommune: versCommune(collecte.commune)?.nom ?? null,
    destinataireNom: destinataire.nom ?? '',
    destinataireTelephone: destinataire.telephone ?? '',
    livraisonAdresse: livraison.adresse ?? '',
    livraisonCommune: versCommune(livraison.commune)?.nom ?? null,
    colis: lireListe(json.colis).map(versColisCommande),
    paiement: paiement && {
      statut: paiement.statut ?? '',
      montant: lireNombre(paiement.montant) ?? 0,
      moyen: paiement.moyen ?? null,
      payeLe: lireDate(paiement.paye_le),
    },
    payeeLe: lireDate(json.payee_le),
  };
  commande.estPayee = commande.statut === 'payee' || commande.payeeLe !== null;
  return commande;
}

/** Devis calculé par le serveur : station B, prix de base, supplément. */
function versDevis(json) {
  const supplement = lireObjet(json.supplement);
  return {
    modeReception: json.mode_reception ?? null,
    stationArrivee: versStation(json.station_arrivee),
    montantBase: lireNombre(json.montant_base) ?? 0,
    montantSupplement: lireNombre(json.montant_supplement) ?? 0,
    montantTotal: lireNombre(json.montant_total) ?? 0,
    distanceKm: lireNombre(supplement.distance_km),
  };
}

export async function creerCommande(donnees) {
  return versCommande(lireObjet(await api.post('/client/commandes', donnees)));
}

/** Remplace un brouillon après un retour en arrière dans le parcours. */
export async function remplacerCommande(id, donnees) {
  return versCommande(lireObjet(await api.put(`/client/commandes/${id}`, donnees)));
}

export async function detailCommande(id) {
  return versCommande(lireObjet(await api.get(`/client/commandes/${id}`)));
}

export async function devisCommande(id) {
  return versDevis(lireObjet(await api.get(`/client/commandes/${id}/simulation`)));
}

/**
 * Envoie la photo d'un colis du brouillon (multipart, champ « photo »). Une
 * nouvelle photo remplace la précédente, jusqu'à la confirmation.
 */
export function envoyerPhotoColis(codeSuivi, photo) {
  const formulaire = new FormData();
  formulaire.append('photo', photo);
  return api.postFormulaire(`/client/colis/${encodeURIComponent(codeSuivi)}/photo`, formulaire);
}

/** Adresse de la photo d'un colis, à afficher avec ImageProtegee. */
export function adressePhotoColis(codeSuivi) {
  return `/client/colis/${encodeURIComponent(codeSuivi)}/photo`;
}

/** Confirme la commande : le serveur choisit les stations et fige le prix. */
export async function confirmerCommande(id, { modeReglement }) {
  return versCommande(lireObjet(await api.post(`/client/commandes/${id}/confirmation`, { mode_reglement: modeReglement })));
}

/** Paiement GeniusPay initié : adresse de la page de paiement et références. */
export function versPaiementInitie(json) {
  return {
    checkoutUrl: json.checkout_url ?? '',
    paiementId: json.paiement_id ?? null,
    reference: json.reference ?? null,
    // Référence GeniusPay : sert à vérifier le paiement auprès du serveur.
    referenceFournisseur: json.reference_fournisseur ?? null,
    montant: lireNombre(json.montant),
    urlRetour: json.url_retour ?? null,
  };
}

/** Ouvre un paiement GeniusPay pour une commande confirmée. */
export async function payerCommande(id) {
  return versPaiementInitie(lireObjet(await api.post(`/client/commandes/${id}/paiement`)));
}

/** Destinataires déjà servis par le client (puces « Récents »). */
export async function destinatairesRecents() {
  return lireListe(await api.get('/client/destinataires/recents', { limit: 8 })).map((json) => {
    const livraison = lireObjet(json.livraison);
    return {
      nom: json.nom ?? '',
      telephone: json.telephone ?? '',
      adresse: livraison.adresse ?? null,
      repere: livraison.repere ?? null,
      lieu: {
        nom: livraison.adresse ?? '',
        latitude: lireNombre(livraison.latitude) ?? 0,
        longitude: lireNombre(livraison.longitude) ?? 0,
        commune: versCommune(livraison.commune),
      },
    };
  });
}
