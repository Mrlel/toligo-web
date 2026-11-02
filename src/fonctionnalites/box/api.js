import { api, ApiErreur } from '../../api/client';
import { lireBooleen, lireDate, lireEntier, lireListe, lireNombre, lireObjet } from '../../utils/lecture';

/**
 * Location de box de stockage (fonctionnalité V1, API existante), comme box.dart.
 *
 * Attention : certaines réponses V1 donnent les nombres sous forme de texte
 * et les dates au format « 2026-10-08 10:00:00 » ; les fonctions lire*()
 * absorbent ces différences.
 */

export function versEntrepot(json) {
  return {
    id: json.id,
    nom: json.nom ?? '',
    localite: json.localite ?? null,
    commune: json.commune ?? null,
    latitude: lireNombre(json.latitude),
    longitude: lireNombre(json.longitude),
    distanceKm: lireNombre(json.distance_km),
    nbBoxLibres: lireEntier(json.nb_box_libres),
    prixMinHeure: lireNombre(json.prix_min_heure),
  };
}

/** « Entrepôt Riviera Palmeraie » -> « Riviera Palmeraie » (sous-titres des maquettes). */
export function nomCourt(nom) {
  return (nom ?? '').replace(/^entrepôt\s+/i, '');
}

function versLocation(json) {
  const objet = lireObjet(json.objet);
  const box = lireObjet(json.box);
  const entrepot = lireObjet(box.entrepot);
  const paiement = lireObjet(json.paiement);
  const location = {
    id: json.id,
    // `en_attente`, `active`, `terminee`, `annulee`.
    statut: json.statut ?? '',
    montant: lireNombre(json.montant_total) ?? 0,
    debut: lireDate(json.date_debut),
    fin: lireDate(json.date_fin),
    dureeHeures: lireEntier(json.duree_heures),
    objetNom: objet.nom ?? null,
    objetCategorie: lireObjet(objet.type_objet).libelle ?? null,
    caisseId: box.id ?? null,
    caisseNumero: box.numero !== undefined && box.numero !== null ? String(box.numero) : null,
    entrepotNom: entrepot.nom ?? null,
    entrepotLatitude: lireNombre(entrepot.latitude),
    entrepotLongitude: lireNombre(entrepot.longitude),
    // Entrepôt de la box, pour « Relouer ».
    entrepot: entrepot.id ? versEntrepot(entrepot) : null,
    paiementStatut: paiement.statut ?? null,
    paiementCheckoutUrl: paiement.checkout_url ?? null,
    paiementReference: paiement.reference ?? null,
  };
  location.estActive = location.statut === 'active';
  location.estEnAttente = location.statut === 'en_attente';
  location.boxLibelle = `BOX-${location.caisseNumero ?? ''}`;
  return location;
}

/** Durée d'une location : « 24 h », « 48 h », « 3 jours » (en jours à partir de 3 jours pleins). */
export function libelleDuree(heures) {
  return heures >= 72 && heures % 24 === 0 ? `${heures / 24} jours` : `${heures} h`;
}

/** Box disponible pour une recherche, avec son prix total. */
function versBoxProposee(json) {
  const box = lireObjet(json.box);
  const dimensions = lireObjet(box.dimensions);
  const longueur = lireNombre(dimensions.longueur) ?? 0;
  const largeur = lireNombre(dimensions.largeur) ?? 0;
  const hauteur = lireNombre(dimensions.hauteur) ?? 0;

  // Lettre de taille, d'après le volume : S jusqu'à 120 L, M jusqu'à 250 L,
  // L jusqu'à 500 L, XL au-delà.
  const litres = (longueur * largeur * hauteur) / 1000;
  const taille = litres <= 120 ? 'S' : litres <= 250 ? 'M' : litres <= 500 ? 'L' : 'XL';

  return {
    id: box.id,
    numero: box.numero !== undefined && box.numero !== null ? String(box.numero) : '',
    longueur,
    largeur,
    hauteur,
    dimensions: `${Math.round(longueur)} × ${Math.round(largeur)} × ${Math.round(hauteur)} cm`,
    taille,
    poidsMax: lireNombre(box.poids),
    prixParHeure: lireNombre(box.prix_par_heure) ?? 0,
    prixTotal: lireNombre(json.price) ?? 0,
  };
}

/** Date au format attendu par l'API V1 : « 2026-10-08 10:00:00 » (heure locale). */
export function dateApi(date) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())} ${deux(date.getHours())}:${deux(date.getMinutes())}:00`;
}

export async function entrepotsProches(latitude, longitude, rayonKm = 10) {
  return lireListe(await api.get('/client/entrepots/nearby', { lat: latitude, lng: longitude, radius: rayonKm })).map(versEntrepot);
}

export async function tousLesEntrepots() {
  return lireListe(await api.get('/client/entrepots')).map(versEntrepot);
}

export async function typesObjets() {
  return lireListe(await api.get('/types-objets')).map((json) => ({ id: json.id, libelle: json.libelle ?? '' }));
}

/** Estimation des dimensions d'un objet à partir de 1 à 3 photos (fichiers). */
export async function estimerDimensions(photos) {
  const formulaire = new FormData();
  photos.forEach((photo) => formulaire.append('images[]', photo));
  const json = lireObjet(await api.postFormulaire('/client/objets/analyser-image', formulaire));
  return {
    longueur: lireNombre(json.longueur) ?? 0,
    largeur: lireNombre(json.largeur) ?? 0,
    hauteur: lireNombre(json.hauteur) ?? 0,
  };
}

/**
 * Recherche des box adaptées. `recherche` : { entrepot, typeObjet,
 * libelleObjet, longueur, largeur, hauteur, poids, debut, fin } (dates en ISO).
 */
export async function rechercherBox(recherche) {
  const donnees = await api.post('/client/locations/search-caisses', {
    warehouseid: recherche.entrepot.id,
    categoryid: recherche.typeObjet.id,
    libelle_objet: recherche.libelleObjet,
    dimensions: { longueur: recherche.longueur, largeur: recherche.largeur, hauteur: recherche.hauteur },
    poids: recherche.poids,
    fromDateLocation: dateApi(new Date(recherche.debut)),
    toDateLocation: dateApi(new Date(recherche.fin)),
  });
  return lireListe(donnees).map(versBoxProposee);
}

/** Crée la location (en attente de paiement). Renvoie l'adresse de la page GeniusPay. */
export async function reserverBox(recherche, box) {
  const donnees = await api.post('/client/locations', {
    caisse_id: box.id,
    category_id: recherche.typeObjet.id,
    libelle_objet: recherche.libelleObjet,
    fromDateLocation: dateApi(new Date(recherche.debut)),
    toDateLocation: dateApi(new Date(recherche.fin)),
  });
  // L'API V1 renvoie directement l'adresse (texte), parfois dans un objet.
  if (typeof donnees === 'string') return donnees;
  const url = lireObjet(donnees).checkout_url ?? lireObjet(donnees).url;
  if (!url) throw new ApiErreur("La page de paiement n'a pas pu être ouverte. Réessayez.", { statut: 500 });
  return url;
}

export async function listerLocations() {
  return lireListe(await api.get('/client/locations')).map(versLocation);
}

export async function detailLocation(id) {
  return versLocation(lireObjet(await api.get(`/client/locations/${id}`)));
}

/** Box louées avec leur code d'accès principal (GET /client/caisses-louees). */
export async function boxLouees() {
  return lireListe(await api.get('/client/caisses-louees')).map((json) => {
    const entrepot = lireObjet(json.entrepot);
    const code = json.smartlock_code !== undefined && json.smartlock_code !== null ? String(json.smartlock_code) : '';
    return {
      locationId: json.locationId ?? '',
      statut: json.statut ?? '',
      numero: json.numero !== undefined && json.numero !== null ? String(json.numero) : null,
      code: code || null,
      expireLe: lireDate(json.expired_at),
      entrepotNom: entrepot.nom ?? null,
      lienItineraire: entrepot.location_url ?? null,
      objetNom: lireObjet(json.objet).nom ?? null,
    };
  });
}

export function annulerLocation(id) {
  return api.supprimer(`/client/locations/${id}`);
}

/** Code d'accès temporaire (usage unique, 6 h). */
function versCodeAcces(json) {
  return {
    id: String(json.id),
    code: json.code !== undefined && json.code !== null ? String(json.code) : '',
    libelle: json.label ?? json.libelle ?? null,
    debut: lireDate(json.started_at ?? json.code_date_debut),
    fin: lireDate(json.expired_at ?? json.date_fin),
    actif: lireBooleen(json.is_active) && !lireBooleen(json.is_expired),
  };
}

export async function codesTemporaires(locationId) {
  return lireListe(await api.get(`/client/access-codes/location/${locationId}`)).map(versCodeAcces);
}

export async function creerCodeTemporaire({ locationId, libelle, usageUnique, debut }) {
  const donnees = await api.post('/client/access-codes', {
    location_id: locationId,
    label: libelle,
    usage_unique: usageUnique,
    ...(debut ? { date_debut: dateApi(debut) } : {}),
  });
  return versCodeAcces(lireObjet(donnees));
}

export async function regenererCode(locationId) {
  return versCodeAcces(lireObjet(await api.post(`/client/locations/${locationId}/access-code/regenerate`)));
}

export function revoquerCode(codeId) {
  return api.supprimer(`/client/access-codes/${codeId}`);
}

export function libelleStatutLocation(statut) {
  const libelles = { active: 'Active', en_attente: 'Paiement en attente', terminee: 'Terminée', annulee: 'Annulée' };
  return libelles[statut] ?? statut;
}
