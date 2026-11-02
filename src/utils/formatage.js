/**
 * Mise en forme des montants, dates et noms pour l'affichage (comme
 * formatage.dart sur le mobile).
 */

const nombre = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
const uneDecimale = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatHeure = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const formatJourCourt = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const formatJourLong = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const formatDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
const formatJourMois = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

/** 2500 -> « 2 500 F ». */
export function prix(montant) {
  return montant === null || montant === undefined ? '—' : `${nombre.format(Math.round(montant))} F`;
}

/** 3.4 -> « 3,4 km ». */
export function distance(km) {
  return km === null || km === undefined ? '' : `${uneDecimale.format(km)} km`;
}

/** « 13:52 » */
export function heure(date) {
  return date ? formatHeure.format(date) : '';
}

/** « mer. 8 oct. · 10:00 » */
export function dateHeure(date) {
  return date ? `${formatJourCourt.format(date)} · ${heure(date)}` : '';
}

/** « mer. 8 oct. 10:00 » (sans le point médian). */
export function jourEtHeure(date) {
  return date ? `${formatJourCourt.format(date)} ${heure(date)}` : '';
}

/** « 8 oct. 2026 » */
export function date(valeur) {
  return valeur ? formatDate.format(valeur) : '';
}

/** « 8 oct. » */
export function jourMois(valeur) {
  return valeur ? formatJourMois.format(valeur) : '';
}

/** Écart en jours entre aujourd'hui et la date (0 = aujourd'hui, 1 = hier). */
function joursEcoules(valeur) {
  const maintenant = new Date();
  const aujourdhui = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  const jour = new Date(valeur.getFullYear(), valeur.getMonth(), valeur.getDate());
  return Math.round((aujourdhui - jour) / 86400000);
}

/** Vrai si la date tombe aujourd'hui. */
export function estAujourdhui(valeur) {
  return Boolean(valeur) && joursEcoules(valeur) === 0;
}

/** « aujourd'hui à 13:52 », « hier à 16:40 », sinon « mer. 8 oct. à 10:00 ». */
export function moment(valeur) {
  if (!valeur) return '';
  const ecart = joursEcoules(valeur);
  if (ecart === 0) return `aujourd'hui à ${heure(valeur)}`;
  if (ecart === 1) return `hier à ${heure(valeur)}`;
  return `${formatJourCourt.format(valeur)} à ${heure(valeur)}`;
}

/** Libellé de regroupement par jour : « AUJOURD'HUI », « HIER », « MERCREDI 8 OCTOBRE ». */
export function jour(valeur) {
  const ecart = joursEcoules(valeur);
  if (ecart === 0) return "AUJOURD'HUI";
  if (ecart === 1) return 'HIER';
  return formatJourLong.format(valeur).toUpperCase();
}

/** Durée lisible à partir de millisecondes : « 23 h », « 2 j 4 h », « 45 min ». */
export function duree(millisecondes) {
  if (millisecondes <= 0) return '0 min';
  const minutes = Math.floor(millisecondes / 60000);
  const heures = Math.floor(minutes / 60);
  const jours = Math.floor(heures / 24);
  if (jours >= 1) {
    const reste = heures % 24;
    return reste === 0 ? `${jours} j` : `${jours} j ${reste} h`;
  }
  if (heures >= 1) return `${heures} h`;
  return `${minutes} min`;
}

/** « Aya Koné » -> « AK ». */
export function initiales(nom) {
  if (!nom || !nom.trim()) return '?';
  const mots = nom.trim().split(/\s+/);
  const premiere = Array.from(mots[0])[0];
  const derniere = mots.length > 1 ? Array.from(mots[mots.length - 1])[0] : '';
  return (premiere + derniere).toUpperCase();
}

/** « Aya Koné » -> « Aya ». */
export function prenom(nom) {
  return !nom || !nom.trim() ? '' : nom.trim().split(/\s+/)[0];
}

/** Met la première lettre en majuscule : « mer. 8 oct. » -> « Mer. 8 oct. ». */
export function majuscule(texte) {
  return texte ? texte[0].toUpperCase() + texte.slice(1) : texte;
}
