/**
 * Numéros de téléphone ivoiriens (comme telephone.dart sur le mobile).
 *
 * L'API attend le format international `+2250708123456` (décision D28).
 * L'utilisateur, lui, tape « 07 08 12 34 56 » : ces fonctions font le lien.
 */

const MOBILE = /^\+225(01|05|07)\d{8}$/;

/** « 07 08 12 34 56 » -> « +2250708123456 ». Null si ce n'est pas un numéro à 10 chiffres. */
export function normaliser(saisie) {
  const chiffres = String(saisie ?? '').replace(/[^\d+]/g, '');
  if (/^\+225\d{10}$/.test(chiffres)) return chiffres;
  if (/^00225\d{10}$/.test(chiffres)) return `+${chiffres.slice(2)}`;
  if (/^225\d{10}$/.test(chiffres)) return `+${chiffres}`;
  if (/^\d{10}$/.test(chiffres)) return `+225${chiffres}`;
  return null;
}

/** Vrai pour un mobile ivoirien (01, 05 ou 07 suivi de 8 chiffres). */
export function estMobileValide(saisie) {
  const numero = normaliser(saisie);
  return numero !== null && MOBILE.test(numero);
}

/** « +2250708123456 » -> « 07 08 12 34 56 ». */
export function afficher(numero) {
  if (!numero) return '';
  const normalise = normaliser(numero);
  if (!normalise) return numero;
  return normalise.slice(4).match(/.{1,2}/g).join(' ');
}

/** Message d'erreur pour un champ de formulaire, ou null si le numéro est bon. */
export function valider(saisie) {
  if (!saisie || !saisie.trim()) return 'Saisissez un numéro de téléphone.';
  if (!estMobileValide(saisie)) {
    return 'Numéro de mobile ivoirien attendu (10 chiffres, commençant par 01, 05 ou 07).';
  }
  return null;
}

/** Garde seulement les chiffres, les espaces et le « + » pendant la saisie. */
export function filtrerSaisie(texte) {
  return texte.replace(/[^\d +]/g, '');
}
