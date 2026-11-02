import { api } from '../../api/client';
import { lireBooleen, lireListe, lireNombre, lireObjet } from '../../utils/lecture';

/** Commune d'une adresse ou d'un lieu : { id, nom }, ou null. */
export function versCommune(json) {
  if (!json || typeof json !== 'object' || !json.id) return null;
  return { id: json.id, nom: json.nom ?? '' };
}

/** Adresse du carnet du client (elle sert d'adresse d'expédition). */
export function versAdresse(json) {
  return {
    id: json.id,
    libelle: json.libelle ?? '',
    parDefaut: lireBooleen(json.par_defaut),
    nomContact: json.nom_contact ?? '',
    telephone: json.telephone ?? '',
    adresse: json.adresse ?? '',
    repere: json.repere ?? null,
    commune: versCommune(json.commune),
    latitude: lireNombre(json.latitude) ?? 0,
    longitude: lireNombre(json.longitude) ?? 0,
    instructions: json.instructions ?? null,
  };
}

/** Données envoyées à l'API pour créer ou modifier une adresse. */
function versApi(saisie) {
  return {
    libelle: saisie.libelle,
    nom_contact: saisie.nomContact,
    telephone: saisie.telephone,
    adresse: saisie.adresse,
    repere: saisie.repere || null,
    latitude: saisie.latitude,
    longitude: saisie.longitude,
    instructions: saisie.instructions || null,
    par_defaut: saisie.parDefaut,
  };
}

/** Carnet d'adresses, l'adresse par défaut en premier. */
export async function listerAdresses() {
  return lireListe(await api.get('/client/adresses')).map(versAdresse);
}

export async function creerAdresse(saisie) {
  return versAdresse(lireObjet(await api.post('/client/adresses', versApi(saisie))));
}

export async function modifierAdresse(id, saisie) {
  return versAdresse(lireObjet(await api.put(`/client/adresses/${id}`, versApi(saisie))));
}

export function definirParDefaut(id) {
  return api.patch(`/client/adresses/${id}/par-defaut`);
}

export function supprimerAdresse(id) {
  return api.supprimer(`/client/adresses/${id}`);
}

/** Adresse par défaut du carnet, sinon la première. */
export function adresseParDefaut(adresses) {
  return adresses.find((a) => a.parDefaut) ?? adresses[0] ?? null;
}
