/**
 * Petites fonctions pour lire le JSON de l'API sans planter sur un type
 * inattendu : certaines routes V1 renvoient des nombres sous forme de texte
 * (« 2500.00 ») et des dates au format « 2026-10-08 10:00:00 ».
 */

/** Nombre, ou null. « 2,5 » et « 2.5 » donnent 2.5. */
export function lireNombre(valeur) {
  if (valeur === null || valeur === undefined || valeur === '') return null;
  if (typeof valeur === 'number') return Number.isFinite(valeur) ? valeur : null;
  const nombre = Number(String(valeur).replace(',', '.'));
  return Number.isFinite(nombre) ? nombre : null;
}

/** Entier, ou null. */
export function lireEntier(valeur) {
  const nombre = lireNombre(valeur);
  return nombre === null ? null : Math.round(nombre);
}

/** true, 1, « 1 » ou « true » donnent vrai. */
export function lireBooleen(valeur) {
  if (typeof valeur === 'boolean') return valeur;
  if (typeof valeur === 'number') return valeur !== 0;
  if (typeof valeur === 'string') return valeur === '1' || valeur.toLowerCase() === 'true';
  return false;
}

/** Date ISO 8601 ou « 2026-10-08 10:00:00 », ou null. */
export function lireDate(valeur) {
  if (!valeur || typeof valeur !== 'string') return null;
  // « 2026-10-08 10:00:00 » : Safari exige le T entre la date et l'heure.
  const date = new Date(/^\d{4}-\d{2}-\d{2} /.test(valeur) ? valeur.replace(' ', 'T') : valeur);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Objet, ou {} si la valeur n'en est pas un. */
export function lireObjet(valeur) {
  return valeur && typeof valeur === 'object' && !Array.isArray(valeur) ? valeur : {};
}

/** Liste d'objets, ou [] si la valeur n'en est pas une. */
export function lireListe(valeur) {
  return Array.isArray(valeur) ? valeur.filter((e) => e && typeof e === 'object') : [];
}
