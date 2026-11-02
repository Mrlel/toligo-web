import { api } from '../../api/client';
import { versFormatResume } from '../../commun/formats';
import { lireBooleen, lireDate, lireEntier, lireListe, lireNombre, lireObjet } from '../../utils/lecture';
import { versCommune } from '../adresses/api';

/**
 * Suivi des colis envoyés : « Mes envois », détail, preuves, évaluation et
 * incidents (comme suivi.dart). Parcours V3.3 : dépôt en box, ramassage,
 * stations A et B, remise.
 */

/**
 * Ce que le client doit faire pour que le colis avance : `paiement`,
 * `depot_box` (déposer le colis avec son code), `nouveau_box` (réservation
 * expirée), `complement` (supplément de prix après un changement de format)
 * ou `evaluation`.
 */
function versAction(json) {
  if (!json || typeof json !== 'object') return null;
  return {
    type: json.type ?? '',
    commandeId: json.commande_id ?? null,
    box: json.box ?? null,
    code: json.code ?? null,
    expireLe: lireDate(json.expire_le),
    montant: lireNombre(json.montant),
  };
}

function versProgression(json) {
  const objet = lireObjet(json);
  const position = lireEntier(objet.position) ?? 0;
  const total = lireEntier(objet.total) ?? 1;
  return { position, total, ratio: total === 0 ? 0 : position / total };
}

/** Colis dans la liste « Mes envois ». */
function versColisResume(json) {
  return {
    codeSuivi: json.code_suivi ?? '',
    statut: json.statut ?? '',
    destinataireNom: lireObjet(json.destinataire).nom ?? '',
    commune: json.commune_livraison ?? null,
    format: versFormatResume(json.format),
    prix: lireNombre(json.prix) ?? 0,
    paiementStatut: json.paiement_statut ?? '',
    progression: versProgression(json.progression),
    jalonCourant: json.jalon_courant ?? null,
    stationArrivee: lireObjet(json.station_arrivee).nom ?? null,
    action: versAction(json.action_requise),
    livreLe: lireDate(json.livre_le),
    creeLe: lireDate(json.created_at),
  };
}

/** Une étape de la frise de suivi. `etat` : `fait`, `en_cours` ou `a_venir`. */
function versJalon(json) {
  return {
    code: json.code ?? '',
    libelle: json.libelle ?? '',
    etat: json.etat ?? 'a_venir',
    survenuLe: lireDate(json.survenu_le),
    detail: json.detail ?? null,
    preuveDisponible: lireBooleen(json.preuve_disponible),
  };
}

/** Détail d'un colis (écrans Suivi et Colis livré). */
function versColisDetail(json) {
  const commande = lireObjet(json.commande);
  const destinataire = lireObjet(json.destinataire);
  const livraison = lireObjet(json.livraison);
  const expediteur = lireObjet(json.collecte);
  const box = json.box && typeof json.box === 'object' ? json.box : null;
  const effective = lireObjet(json.livraison_effective);
  const livreur = lireObjet(effective.dernier_livreur);
  const evaluation = lireObjet(json.evaluation);

  return {
    codeSuivi: json.code_suivi ?? '',
    statut: json.statut ?? '',
    estLivre: json.statut === 'livre',
    commandeId: commande.id ?? null,
    modeReglement: commande.mode_reglement ?? null,
    // `retrait_station`, `livraison_domicile` ou `box_stockage`.
    modeReception: commande.mode_reception ?? null,
    box: box && { numero: box.numero ?? '', adresse: box.adresse ?? null },
    deposeLe: lireDate(json.depose_le),
    format: versFormatResume(json.format),
    description: json.description ?? null,
    prix: lireNombre(json.prix) ?? 0,
    destinataireNom: destinataire.nom ?? '',
    destinataireTelephone: destinataire.telephone ?? '',
    adresseLivraison: livraison.adresse ?? '',
    communeLivraison: versCommune(livraison.commune)?.nom ?? null,
    livraisonLatitude: lireNombre(livraison.latitude),
    livraisonLongitude: lireNombre(livraison.longitude),
    expediteurLatitude: lireNombre(expediteur.latitude),
    expediteurLongitude: lireNombre(expediteur.longitude),
    stationDepart: lireObjet(json.station_depart).nom ?? null,
    stationArrivee: lireObjet(json.station_arrivee).nom ?? null,
    distanceStationsKm: lireNombre(json.distance_stations_km),
    progression: versProgression(json.progression),
    jalons: lireListe(json.jalons).map(versJalon),
    suiviPosition: lireBooleen(json.suivi_position),
    action: versAction(json.action_requise),
    lienSuivi: json.lien_suivi ?? null,
    paiement: lireObjet(json.paiement),
    remisA: effective.remis_a ?? null,
    livreLe: lireDate(effective.livre_le) ?? lireDate(json.livre_le),
    trajet: Array.isArray(effective.trajet) ? effective.trajet.map(String) : [],
    dernierLivreur: livreur.nom ?? null,
    vehicule: livreur.vehicule ?? null,
    // Note déjà donnée par le client, ou null.
    note: lireEntier(evaluation.note),
    incidents: lireListe(json.incidents),
  };
}

/** Liste « Mes envois » d'un onglet : `en_cours`, `termines` ou `annules`. */
export async function listerEnvois(onglet, page = 1) {
  const json = lireObjet(await api.get('/client/colis', { onglet, page }));
  const compteurs = {};
  Object.entries(lireObjet(json.compteurs)).forEach(([cle, valeur]) => {
    compteurs[cle] = lireEntier(valeur) ?? 0;
  });
  const pagination = lireObjet(json.pagination);
  return {
    compteurs,
    colis: lireListe(json.colis).map(versColisResume),
    page: lireEntier(pagination.page) ?? 1,
    dernierePage: lireEntier(pagination.derniere_page) ?? 1,
  };
}

export async function detailColis(code) {
  return versColisDetail(lireObjet(await api.get(`/client/colis/${encodeURIComponent(code)}`)));
}

/** Position du livreur, ou null si elle n'est pas disponible. */
export async function positionColis(code) {
  const json = await api.get(`/client/colis/${encodeURIComponent(code)}/position`);
  const latitude = lireNombre(json?.latitude);
  const longitude = lireNombre(json?.longitude);
  if (latitude === null || longitude === null) return null;
  return { latitude, longitude, majLe: lireDate(json.maj_le) };
}

/** Preuves enregistrées sur un colis (dépôt, ramassage, contrôle, départ, remise). */
export async function listerPreuves(code) {
  return lireListe(await api.get(`/client/colis/${encodeURIComponent(code)}/preuves`)).map((json) => ({
    type: json.type ?? '',
    libelle: json.libelle ?? '',
    detail: json.detail ?? null,
    resultat: json.resultat ?? null,
    survenuLe: lireDate(json.survenu_le),
    disponible: json.disponible === undefined || json.disponible === null || lireBooleen(json.disponible),
    photoUrl: json.photo_url ?? null,
  }));
}

/**
 * Photo stockée en privé sur le serveur : téléchargée avec le jeton.
 * `url` est donnée par l'API (« /api/client/preuves/12/fichier » ou complète).
 */
export function telechargerPhoto(url) {
  const chemin = url.replace(/^https?:\/\/[^/]+/, '').replace(/^\/?api/, '');
  return api.telecharger(chemin.startsWith('/') ? chemin : `/${chemin}`);
}

export function evaluerLivraison(code, { note, etiquettes, commentaire }) {
  return api.post(`/client/colis/${encodeURIComponent(code)}/evaluation`, {
    note,
    etiquettes,
    commentaire: commentaire || null,
  });
}

/** Signale un problème ; renvoie la référence du signalement. */
export async function signalerIncident(code, { type, description, photo }) {
  const formulaire = new FormData();
  formulaire.append('type', type);
  formulaire.append('description', description);
  if (photo) formulaire.append('photo', photo);
  const json = lireObjet(await api.postFormulaire(`/client/colis/${encodeURIComponent(code)}/incidents`, formulaire));
  return json.reference ?? null;
}

// --- Avant le dépôt dans le box (CDC V3.3 §21.9, D11) ---

/** Box de réception et code de dépôt renvoyés après un changement. */
function versNouveauBox(json) {
  const box = lireObjet(json.box);
  return {
    boxNumero: box.numero ?? null,
    code: json.code_ouverture ?? null,
    expireLe: lireDate(json.code_expire_le),
  };
}

/**
 * Réservation expirée ou box inutilisable : un autre box est attribué, avec
 * un nouveau code. L'ancien box n'est plus proposé.
 */
export async function demanderNouveauBox(code) {
  return versNouveauBox(lireObjet(await api.post(`/client/colis/${encodeURIComponent(code)}/nouveau-box`)));
}

/**
 * Le colis ne tient pas dans son box : nouveau format, nouveau prix et, si
 * un box était attribué, un autre box qui accepte ce format.
 */
export async function changerFormatColis(code, formatId) {
  const json = lireObjet(await api.put(`/client/colis/${encodeURIComponent(code)}/format`, { format_colis_id: formatId }));
  return {
    ...versNouveauBox(json),
    prix: lireNombre(json.prix),
    complement: lireNombre(json.complement_a_payer),
    remboursement: lireNombre(json.remboursement),
  };
}

/** Ouvre le paiement GeniusPay du complément de prix d'un colis. */
export async function payerComplement(code) {
  const json = lireObjet(await api.post(`/client/colis/${encodeURIComponent(code)}/paiement`));
  return { checkoutUrl: json.checkout_url ?? '', montant: lireNombre(json.montant) };
}

/** Libellé court d'un statut de colis (CDC V3.3 §20), pour les pastilles. */
export function libelleStatutColis(statut) {
  const libelles = {
    cree: 'Confirmé',
    en_attente_depot: 'À déposer',
    depose_en_box: 'Déposé en box',
    en_ramassage: 'Ramassage en cours',
    ramasse: 'Ramassé',
    arrive_station_a: 'En station de départ',
    en_transit_aerien: 'En route',
    arrive_station_b: 'Arrivé en station',
    en_livraison: 'En livraison',
    echec_livraison: 'Livraison échouée',
    en_box_stockage: 'En box de stockage',
    livre: 'Livré',
    incident: 'Incident',
    retour: 'Retour en cours',
    retourne: 'Retourné',
    annulee: 'Annulé',
  };
  return libelles[statut] ?? statut;
}

/** Ton de la pastille d'un statut de colis. */
export function tonStatutColis(statut) {
  if (statut === 'livre') return 'succes';
  if (statut === 'incident' || statut === 'echec_livraison') return 'erreur';
  // Retourné, annulé : gris, comme dans la maquette A-Envois.
  if (statut === 'annulee' || statut === 'retourne' || statut === 'retour') return 'neutre';
  return 'accent';
}
