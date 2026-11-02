import { api, ApiErreur } from '../../api/client';
import { lireDate, lireObjet } from '../../utils/lecture';

/**
 * Appels d'API de l'inscription et de la connexion (routes publiques),
 * comme depot_authentification.dart.
 */

/**
 * Crée le compte et déclenche l'envoi du code SMS. Renvoie le moment à
 * partir duquel un nouveau code peut être demandé.
 */
export async function inscrire({ nomComplet, telephone, email, motDePasse, confirmation }) {
  const donnees = lireObjet(
    await api.post('/client/register', {
      nom_complet: nomComplet,
      telephone,
      ...(email ? { email } : {}),
      password: motDePasse,
      password_confirmation: confirmation,
      cgu_acceptees: true,
    }),
  );
  return lireDate(donnees.renvoi_possible_le);
}

/** Vérifie le code reçu par SMS. Renvoie le jeton de connexion. */
export async function verifierCode(telephone, code) {
  const donnees = lireObjet(await api.post('/client/verify-otp', { telephone, code }));
  return donnees.token;
}

export async function renvoyerCode(telephone) {
  const donnees = lireObjet(await api.post('/client/resend-otp', { telephone }));
  return lireDate(donnees.renvoi_possible_le);
}

/** Renvoie le jeton de connexion. */
export async function connecter(telephone, motDePasse) {
  const donnees = lireObjet(await api.post('/client/login', { telephone, password: motDePasse }));
  return donnees.token;
}

export async function deconnecter() {
  try {
    await api.post('/client/logout');
  } catch (erreur) {
    // Le jeton est effacé dans le navigateur de toute façon.
    if (!(erreur instanceof ApiErreur)) throw erreur;
  }
}

// --- Mot de passe oublié ---

export function demanderReinitialisation(telephone) {
  return api.post('/client/forgot-password', { telephone });
}

export function renvoyerCodeReinitialisation(telephone) {
  return api.post('/client/forgot-password/resend', { telephone });
}

/** Renvoie le jeton de réinitialisation à présenter à l'étape suivante. */
export async function verifierCodeReinitialisation(telephone, code) {
  const donnees = lireObjet(await api.post('/client/reset-password/verify', { telephone, code }));
  return donnees.reset_token;
}

export function definirMotDePasse({ telephone, jeton, motDePasse, confirmation }) {
  return api.post('/client/reset-password/confirm', {
    telephone,
    reset_token: jeton,
    new_password: motDePasse,
    new_password_confirmation: confirmation,
  });
}
