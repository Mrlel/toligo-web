import { api, ApiErreur } from '../../api/client';
import { lireBooleen, lireListe, lireNombre, lireObjet } from '../../utils/lecture';
import { versCommune } from '../adresses/api';

/**
 * Lieux : recherche d'un quartier ou d'un repère, et commune d'un point GPS.
 *
 * Un « lieu choisi » est un objet { nom, latitude, longitude, commune }.
 */

/** « Treichville, Abidjan » : le nom du lieu, suivi de sa commune si elle diffère. */
export function descriptionLieu(lieu) {
  if (!lieu) return '';
  return !lieu.commune || lieu.commune.nom === lieu.nom ? lieu.nom : `${lieu.nom}, ${lieu.commune.nom}`;
}

/**
 * Lieux proposés pour une recherche (quartier, pharmacie, marché...). Avec une
 * `position` ({ latitude, longitude }), les plus proches passent en premier.
 */
export async function suggererLieux(recherche, position = null) {
  const parametres = position ? { q: recherche, lat: position.latitude, lng: position.longitude } : { q: recherche };
  return lireListe(await api.get('/lieux/suggerer', parametres)).map((json) => ({
    nom: json.nom ?? '',
    categorie: json.categorie ?? '',
    latitude: lireNombre(json.latitude) ?? 0,
    longitude: lireNombre(json.longitude) ?? 0,
    commune: versCommune(json.commune),
    distanceKm: lireNombre(json.distance_km),
  }));
}

/**
 * Transforme un point GPS en lieu choisi (GET /geo/position), ou lève une
 * erreur si le point est hors de la zone desservie.
 */
export async function lieuDuPoint(latitude, longitude) {
  const position = lireObjet(await api.get('/geo/position', { lat: latitude, lng: longitude }));
  if (!lireBooleen(position.desservie)) {
    throw new ApiErreur('Cette position est en dehors de la zone desservie par Tôligo.', { statut: 422 });
  }
  const commune = versCommune(position.commune);
  return {
    nom: lireObjet(position.lieu_proche).nom ?? commune?.nom ?? 'Position choisie',
    latitude,
    longitude,
    commune,
  };
}

/**
 * Position actuelle, seulement si l'utilisateur l'a déjà autorisée : rien
 * n'est demandé. Null sinon, ou si la position est introuvable.
 */
export async function positionSiAutorisee() {
  try {
    const autorisation = await navigator.permissions?.query({ name: 'geolocation' });
    return autorisation?.state === 'granted' ? await positionActuelle() : null;
  } catch {
    return null;
  }
}

/**
 * Position GPS actuelle du navigateur, après demande d'autorisation.
 * Lève une ApiErreur au message affichable si c'est impossible.
 */
export function positionActuelle() {
  return new Promise((resoudre, rejeter) => {
    if (!navigator.geolocation) {
      rejeter(new ApiErreur('Votre navigateur ne permet pas de vous localiser.', { statut: 0 }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resoudre({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      (erreur) => {
        const message =
          erreur.code === erreur.PERMISSION_DENIED
            ? "Autorisez l'accès à votre position dans le navigateur pour utiliser cette option."
            : "Impossible d'obtenir votre position. Réessayez.";
        rejeter(new ApiErreur(message, { statut: 0 }));
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
    );
  });
}
