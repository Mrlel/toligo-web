import { api } from '../../api/client';
import { versFormatResume } from '../../commun/formats';
import { lireDate, lireEntier, lireListe, lireNombre, lireObjet } from '../../utils/lecture';
import { versCommune } from '../adresses/api';

/**
 * Appels d'API du parcours de commande :
 * brouillon -> devis indicatif -> confirmation (code de dépôt 48 h).
 *
 * Mise à jour du 26/11/2026 : plus de paiement en ligne. Le client annonce un
 * nombre de colis ; le gestionnaire de l'entrepôt les pèse et les mesure, fixe
 * le prix réel, et l'expéditeur l'accepte au comptoir. Il paie alors sur place
 * (espèces ou Mobile Money), ou c'est le destinataire qui paie à la livraison.
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

/** Modes de paiement : l'expéditeur au dépôt, ou le destinataire à la remise. */
export const MODES_REGLEMENT = {
  sur_place: 'Payé au dépôt',
  a_la_livraison: 'Payé par le destinataire à la livraison',
};

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

/** Site de dépôt (entrepôt desservi par une station). */
function versSite(json) {
  if (!json || typeof json !== 'object') return null;
  return {
    id: json.id,
    nom: json.nom ?? '',
    adresse: json.adresse ?? null,
    latitude: lireNombre(json.latitude),
    longitude: lireNombre(json.longitude),
    distanceKm: lireNombre(json.distance_km),
  };
}

/**
 * Entrepôts où l'expéditeur peut déposer ses colis, du plus proche au plus
 * lointain de son adresse (§9.1, révision du 26/11/2026 : plus de choix de
 * station). Hors de la zone desservie, aucun n'est proposé : la liste vide
 * n'est pas une erreur.
 *
 * @param {{latitude: number, longitude: number}} position Adresse d'expédition.
 */
export async function entrepotsDeDepot({ latitude, longitude }) {
  return lireListe(await api.get('/client/sites-depot', { latitude, longitude })).map(versSite);
}

/**
 * Le refus du serveur porte-t-il sur le lieu de dépôt choisi ? Dans ce cas
 * l'écran de choix est le bon endroit pour le corriger : entrepôt qui ne
 * dessert plus l'adresse, ou détaché de sa station.
 */
export function refusDuLieuDeDepot(erreur) {
  const champs = erreur?.erreurs ?? {};
  if (champs.entrepot_depot_id || champs.station_depart_id) return true;
  return /site de dépôt|ne dessert pas votre adresse/i.test(erreur?.message ?? '');
}

/** Colis d'une commande, tel que l'API le renvoie. */
function versColisCommande(json) {
  return {
    id: json.id,
    codeSuivi: json.code_suivi ?? '',
    statut: json.statut ?? '',
    description: json.description ?? '',
    // Nul tant que le colis n'a pas été pesé et mesuré à l'entrepôt.
    format: versFormatResume(json.format),
    prix: lireNombre(json.prix) ?? 0,
  };
}

/** Estimation { min, max } tant que le prix réel n'est pas fixé, sinon null. */
function versEstimation(json) {
  if (!json || typeof json !== 'object') return null;
  return { min: lireNombre(json.min) ?? 0, max: lireNombre(json.max) ?? 0 };
}

/** Commande de livraison (brouillon, puis confirmée). */
export function versCommande(json) {
  const collecte = lireObjet(json.collecte);
  const destinataire = lireObjet(json.destinataire);
  const livraison = lireObjet(json.livraison);
  const mode = json.mode_reception && typeof json.mode_reception === 'object' ? json.mode_reception : null;
  const paiement = json.paiement && typeof json.paiement === 'object' ? json.paiement : null;
  return {
    id: json.id,
    reference: json.reference ?? '',
    statut: json.statut ?? '',
    montantBase: lireNombre(json.montant_base) ?? 0,
    montantSupplement: lireNombre(json.montant_supplement) ?? 0,
    montantTotal: lireNombre(json.montant_total) ?? 0,
    // Vrai une fois le prix accepté au comptoir de l'entrepôt.
    montantDefinitif: json.montant_definitif === true,
    estimation: versEstimation(json.estimation),
    nbColisDeclares: lireEntier(json.nb_colis_declares),
    // `sur_place` ou `a_la_livraison`.
    modeReglement: json.mode_reglement ?? null,
    // `en_attente` (avant le dépôt), `paye` ou `a_payer_livraison`.
    statutPaiement: json.statut_paiement ?? null,
    modeReception: mode?.code ?? null,
    stationDepart: versStation(json.station_depart),
    stationArrivee: versStation(json.station_arrivee),
    // Entrepôt où l'expéditeur apporte ses colis : celui qu'il a choisi, ou
    // celui que Tôligo a retenu à la confirmation.
    siteDepot: versSite(json.site_depot),
    // Code de dépôt de la commande, valable 48 h : le client le donne au
    // gestionnaire de l'entrepôt avec ses colis. Null avant la confirmation,
    // après le dépôt, ou une fois expiré.
    codeReception:
      json.code_reception && typeof json.code_reception === 'object'
        ? { code: json.code_reception.code ?? '', expireLe: lireDate(json.code_reception.expire_le) }
        : null,
    // Envoi expiré : aucun dépôt dans les 48 h, il peut être réactivé.
    expireeLe: lireDate(json.expiree_le),
    recueLe: lireDate(json.recue_le),
    // Adresse de l'expediteur (colonnes `collecte_*` cote serveur).
    expediteurAdresse: collecte.adresse ?? null,
    expediteurNom: collecte.nom_contact ?? null,
    expediteurCommune: versCommune(collecte.commune)?.nom ?? null,
    destinataireNom: destinataire.nom ?? '',
    destinataireTelephone: destinataire.telephone ?? '',
    livraisonAdresse: livraison.adresse ?? '',
    livraisonCommune: versCommune(livraison.commune)?.nom ?? null,
    colis: lireListe(json.colis).map(versColisCommande),
    // Paiement enregistré au comptoir ou à la livraison : `especes` ou `mobile_money`.
    paiement: paiement && {
      statut: paiement.statut ?? '',
      montant: lireNombre(paiement.montant) ?? 0,
      moyen: paiement.moyen ?? null,
      payeLe: lireDate(paiement.paye_le),
    },
  };
}

/**
 * Devis indicatif calculé par le serveur : station B, supplément du mode de
 * réception et fourchette pour le nombre de colis. La grille des formats que
 * le serveur renvoie aussi n'est plus affichée à la confirmation.
 */
function versDevis(json) {
  const supplement = lireObjet(json.supplement);
  return {
    modeReception: json.mode_reception ?? null,
    stationArrivee: versStation(json.station_arrivee),
    nbColis: lireEntier(json.nb_colis) ?? 0,
    // Supplément pour toute la commande (livraison à domicile) ; la location
    // du box de stockage est comprise dans le prix de chaque colis.
    montantSupplement: lireNombre(supplement.montant) ?? 0,
    distanceKm: lireNombre(supplement.distance_km),
    estimation: versEstimation(json.estimation) ?? { min: 0, max: 0 },
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

/**
 * Réactive un envoi expiré (aucun dépôt dans les 48 h) : un nouveau code de
 * dépôt est émis, valable 48 h.
 */
export async function reactiverCommande(id) {
  return versCommande(lireObjet(await api.post(`/client/commandes/${id}/reactivation`)));
}

export async function devisCommande(id) {
  return versDevis(lireObjet(await api.get(`/client/commandes/${id}/simulation`)));
}

/** Confirme l'envoi avec le mode de paiement ; le serveur émet le code de dépôt. */
export async function confirmerCommande(id, { modeReglement }) {
  return versCommande(lireObjet(await api.post(`/client/commandes/${id}/confirmation`, { mode_reglement: modeReglement })));
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
