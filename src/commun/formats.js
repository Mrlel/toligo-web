import { api } from '../api/client';
import { lireListe, lireNombre } from '../utils/lecture';

/**
 * Formats de colis (Petit, Moyen, Grand...), fixés par l'administrateur.
 *
 * Depuis le 26/11/2026, le client ne choisit plus de format : le gestionnaire
 * de l'entrepôt pèse et mesure chaque colis, et le format en découle. Les
 * formats ne servent plus, côté client, qu'à afficher une grille indicative.
 */

/** « jusqu'à 5 kg » */
export function poidsLisible(poidsMaxKg) {
  const poids = Number.isInteger(poidsMaxKg) ? poidsMaxKg : poidsMaxKg.toFixed(1).replace('.', ',');
  return `jusqu'à ${poids} kg`;
}

/** « 35 × 25 × 15 cm », ou null si une dimension manque. */
export function dimensionsLisibles(dimensions) {
  const { longueur, largeur, hauteur } = dimensions ?? {};
  if (!longueur || !largeur || !hauteur) return null;
  const cm = (v) => (Number.isInteger(v) ? v : v.toFixed(1).replace('.', ','));
  return `${cm(longueur)} × ${cm(largeur)} × ${cm(hauteur)} cm`;
}

function versFormat(json) {
  const dimensions = json.dimensions_max_cm && typeof json.dimensions_max_cm === 'object' ? json.dimensions_max_cm : {};
  return {
    id: json.id,
    code: json.code ?? '',
    libelle: json.libelle ?? '',
    description: json.description ?? '',
    icone: json.icone ?? null,
    poidsMaxKg: lireNombre(json.poids_max_kg) ?? 0,
    dimensions: {
      longueur: lireNombre(dimensions.longueur),
      largeur: lireNombre(dimensions.largeur),
      hauteur: lireNombre(dimensions.hauteur),
    },
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
