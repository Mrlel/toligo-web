/**
 * Client HTTP de l'API Tôligo (équivalent de api_client.dart sur le mobile).
 *
 * - ajoute le jeton de connexion (`Authorization: Bearer ...`) ;
 * - déballe l'enveloppe `{ success, data, message }` : chaque appel renvoie
 *   directement `data` ;
 * - transforme toute erreur en ApiErreur au message affichable ;
 * - prévient la session quand le serveur répond 401, pour renvoyer vers la
 *   connexion.
 *
 * Utilisation : `const adresses = await api.get('/client/adresses');`
 */

/**
 * Adresse de l'API Laravel, terminée par /api (VITE_API_URL dans les fichiers
 * .env). En développement, « /api » : le serveur Vite relaie vers Laravel.
 */
export const API_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api').replace(/\/+$/, '');

/** Erreur renvoyée par l'API, déjà traduite en message affichable. */
export class ApiErreur extends Error {
  /**
   * @param {string} message  Message général renvoyé par le serveur.
   * @param {object} details
   * @param {number|null} details.statut  Code HTTP, ou null si le serveur n'a pas répondu.
   * @param {Object<string, string[]>} details.erreurs  Erreurs de validation par champ.
   * @param {string|null} details.action  Écran suggéré par le serveur (`verify_otp`...).
   */
  constructor(message, { statut = null, erreurs = {}, action = null } = {}) {
    super(message);
    this.statut = statut;
    this.erreurs = erreurs;
    this.action = action;
  }

  get estHorsLigne() {
    return this.statut === null;
  }

  /** Première erreur d'un champ du formulaire, pour l'afficher sous ce champ. */
  erreurDe(champ) {
    return this.erreurs[champ]?.[0] ?? null;
  }

  /** La première erreur de champ si le serveur en a donné, sinon le message général. */
  get messageAffichable() {
    const premiere = Object.values(this.erreurs)[0];
    return premiere?.[0] ?? this.message;
  }
}

/** Message à afficher pour n'importe quelle erreur attrapée. */
export function messageErreur(erreur) {
  return erreur instanceof ApiErreur ? erreur.messageAffichable : 'Une erreur inattendue est survenue.';
}

// La session branche ici la lecture du jeton et la réaction au 401
// (voir src/session/Session.jsx).
let lireJeton = () => null;
let surNonAuthentifie = () => {};

export function configurerApi(options) {
  lireJeton = options.lireJeton;
  surNonAuthentifie = options.surNonAuthentifie;
}

function messageParDefaut(statut) {
  switch (statut) {
    case 401:
      return 'Votre session a expiré. Reconnectez-vous.';
    case 403:
      return 'Action non autorisée.';
    case 404:
      return 'Élément introuvable.';
    case 429:
      return 'Trop de tentatives. Patientez un instant puis réessayez.';
    default:
      return `Une erreur est survenue (code ${statut}). Réessayez dans un instant.`;
  }
}

/** Ajoute les paramètres à l'adresse, en ignorant les valeurs vides. */
function construireUrl(chemin, parametres) {
  // Adresse relative (« /api », proxy Vite en développement) : complétée avec
  // l'adresse de la page. Une adresse absolue reste telle quelle.
  const url = new URL(API_URL + chemin, window.location.origin);
  Object.entries(parametres ?? {}).forEach(([cle, valeur]) => {
    if (valeur !== null && valeur !== undefined) url.searchParams.set(cle, valeur);
  });
  return url.toString();
}

/**
 * Envoie une requête et renvoie la réponse brute (fetch Response) si tout va
 * bien ; lève une ApiErreur sinon.
 */
async function requete(methode, chemin, { parametres, donnees, formulaire } = {}) {
  const entetes = { Accept: 'application/json' };
  const jeton = lireJeton();
  if (jeton) entetes.Authorization = `Bearer ${jeton}`;

  let corps;
  if (formulaire) {
    corps = formulaire; // FormData : le navigateur pose lui-même le Content-Type.
  } else if (donnees !== undefined) {
    entetes['Content-Type'] = 'application/json';
    corps = JSON.stringify(donnees);
  }

  // Au-delà de 45 secondes, on abandonne (comme receiveTimeout sur le mobile).
  const abandon = new AbortController();
  const minuteur = setTimeout(() => abandon.abort(), 45000);

  let reponse;
  try {
    reponse = await fetch(construireUrl(chemin, parametres), {
      method: methode,
      headers: entetes,
      body: corps,
      signal: abandon.signal,
    });
  } catch {
    throw new ApiErreur('Impossible de joindre le serveur. Vérifiez votre connexion internet.');
  } finally {
    clearTimeout(minuteur);
  }

  if (reponse.ok) return reponse;

  if (reponse.status === 401) surNonAuthentifie();

  let json = null;
  try {
    json = await reponse.json();
  } catch {
    // Réponse sans JSON (page d'erreur du serveur) : message par défaut.
  }

  throw new ApiErreur(json?.message || messageParDefaut(reponse.status), {
    statut: reponse.status,
    erreurs: json?.errors && typeof json.errors === 'object' ? json.errors : {},
    action: json?.action ?? null,
  });
}

/** Requête JSON : renvoie `data` de l'enveloppe { success, data, message }. */
async function envoyer(methode, chemin, options) {
  const reponse = await requete(methode, chemin, options);
  if (reponse.status === 204) return null;

  const texte = await reponse.text();
  if (!texte) return null;

  let json;
  try {
    json = JSON.parse(texte);
  } catch {
    return texte;
  }
  return json && typeof json === 'object' && 'success' in json ? json.data : json;
}

export const api = {
  get: (chemin, parametres) => envoyer('GET', chemin, { parametres }),
  post: (chemin, donnees) => envoyer('POST', chemin, { donnees }),
  put: (chemin, donnees) => envoyer('PUT', chemin, { donnees }),
  patch: (chemin, donnees) => envoyer('PATCH', chemin, { donnees }),
  supprimer: (chemin) => envoyer('DELETE', chemin),

  /** Envoi d'un formulaire avec fichiers (photos). */
  postFormulaire: (chemin, formulaire) => envoyer('POST', chemin, { formulaire }),

  /** Télécharge un fichier protégé (photo de preuve) : renvoie un Blob. */
  telecharger: async (chemin) => (await requete('GET', chemin)).blob(),
};
