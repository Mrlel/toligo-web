/**
 * Adresses (« routes ») de tous les écrans de l'application, comme
 * routeur.dart sur le mobile.
 *
 * Pour ouvrir un écran : `naviguer(Routes.colis(code))`.
 */
export const Routes = {
  // --- Accès sans compte ---
  vitrine: '/',
  connexion: '/connexion',
  inscription: '/inscription',
  code: '/code',
  motDePasseOublie: '/mot-de-passe-oublie',

  // --- Écrans principaux (onglets) ---
  accueil: '/accueil',
  envois: '/envois',
  mesBox: '/mes-box',
  profil: '/profil',

  // --- Nouvel envoi ---
  envoi: '/envoi',
  envoiCollecte: '/envoi/collecte',
  envoiDestinataire: '/envoi/destinataire',
  modifierDestinataire: (index) => `/envoi/destinataire/${index}`,
  envoiColis: '/envoi/colis',
  envoiColisAjout: (indexDestinataire = 0) => `/envoi/colis/ajout?pour=${indexDestinataire}`,
  envoiReception: '/envoi/reception',
  envoiRecap: '/envoi/recapitulatif',
  paiementCommande: (id) => `/commandes/${id}/paiement`,
  commandeConfirmee: (id) => `/commandes/${id}/confirmee`,

  // --- Suivi ---
  colis: (code) => `/colis/${encodeURIComponent(code)}`,
  preuves: (code) => `/colis/${encodeURIComponent(code)}/preuves`,
  colisLivre: (code) => `/colis/${encodeURIComponent(code)}/livre`,
  incident: (code) => `/colis/${encodeURIComponent(code)}/incident`,

  // --- Adresses, profil ---
  adresses: '/adresses',
  notifications: '/notifications',
  informations: '/profil/informations',
  aide: '/aide',

  // --- Box ---
  entrepots: '/box/entrepots',
  boxObjet: (entrepotId) => `/box/entrepots/${entrepotId}`,
  boxChoix: '/box/choix',
  boxConfirmee: (locationId) => `/box/locations/${locationId}/confirmee`,
  boxDetail: (locationId) => `/box/locations/${locationId}`,
  codeTemporaire: (locationId) => `/box/locations/${locationId}/code-temporaire`,

  // --- Retour de la page de paiement GeniusPay ---
  paiementRetour: '/paiement-check',
};

/** Les quatre écrans principaux, qui affichent les onglets du bas sur téléphone. */
export const ROUTES_ONGLETS = [Routes.accueil, Routes.envois, Routes.mesBox, Routes.profil];
