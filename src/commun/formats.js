import { api } from '../api/client';
import { lireListe, lireNombre } from '../utils/lecture';

/**
 * Formats de colis (Petit, Moyen, Grand...), fixés par l'administrateur.
 * Le client choisit un format : ni poids ni dimensions à saisir.
 */

/** « jusqu'à 5 kg » */
export function poidsLisible(poidsMaxKg) {
  const poids = Number.isInteger(poidsMaxKg) ? poidsMaxKg : poidsMaxKg.toFixed(1).replace('.', ',');
  return `jusqu'à ${poids} kg`;
}

function versFormat(json) {
  return {
    id: json.id,
    code: json.code ?? '',
    libelle: json.libelle ?? '',
    description: json.description ?? '',
    icone: json.icone ?? null,
    poidsMaxKg: lireNombre(json.poids_max_kg) ?? 0,
    prix: lireNombre(json.prix) ?? 0,
  };
}

/** Format tel qu'il apparaît sur un colis ou une commande. */
export function versFormatResume(json) {
  if (!json || typeof json !== 'object') return null;
  return {
    code: json.code ?? '',
    libelle: json.libelle ?? '',
    icone: json.icone ?? null,
    prix: lireNombre(json.prix),
  };
}

// Les formats changent rarement : on les garde après le premier chargement.
let formatsEnCache = null;

/** Formats de colis actifs (GET /client/formats-colis). */
export async function listerFormats() {
  if (!formatsEnCache) {
    formatsEnCache = api.get('/client/formats-colis').then((donnees) => lireListe(donnees).map(versFormat));
    formatsEnCache.catch(() => {
      formatsEnCache = null; // Nouvel essai au prochain appel.
    });
  }
  return formatsEnCache;
}

/** Nom de l'illustration d'un format (`colis-petit`, `colis-moyen`...). */
export function illustrationDuFormat(icone, code) {
  if (icone) return icone;
  if (code) return `colis-${code}`;
  return 'colis-moyen';
}

/** Dans les maquettes, le petit colis paraît plus petit que le grand. */
export function tailleIllustrationFormat(code) {
  if (code === 'petit') return 38;
  if (code === 'grand') return 58;
  return 50;
}
