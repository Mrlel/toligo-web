import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { configurerApi } from '../api/client';
import { chargerProfil } from '../fonctionnalites/profil/api';

/**
 * Session du client : le jeton de connexion Sanctum, et le profil du client
 * connecté (GET /client/me).
 *
 * Le jeton est gardé dans le navigateur (localStorage) : en rouvrant la page,
 * le client reste connecté.
 */
const ContexteSession = createContext(null);

const CLE_JETON = 'toligo_jeton';

function lireJetonStocke() {
  try {
    return localStorage.getItem(CLE_JETON);
  } catch {
    // Stockage illisible (navigation privée...) : on repart sans session.
    return null;
  }
}

function ecrireJetonStocke(jeton) {
  try {
    if (jeton) localStorage.setItem(CLE_JETON, jeton);
    else localStorage.removeItem(CLE_JETON);
  } catch {
    // Sans stockage, la session ne survivra pas au rechargement de la page.
  }
}

export function FournisseurSession({ children }) {
  const [jeton, setJeton] = useState(lireJetonStocke);
  const [profil, setProfil] = useState(null);
  const [versionProfil, setVersionProfil] = useState(0);

  // Le client API lit toujours le jeton le plus récent.
  const jetonActuel = useRef(jeton);
  jetonActuel.current = jeton;

  const ouvrir = useCallback((nouveauJeton) => {
    ecrireJetonStocke(nouveauJeton);
    jetonActuel.current = nouveauJeton;
    setJeton(nouveauJeton);
  }, []);

  const fermer = useCallback(() => {
    ecrireJetonStocke(null);
    jetonActuel.current = null;
    setJeton(null);
    setProfil(null);
  }, []);

  // Branché pendant le rendu (et non dans un effet) : les écrans enfants
  // appellent l'API dans leurs propres effets, qui passent avant ceux du parent.
  configurerApi({
    lireJeton: () => jetonActuel.current,
    // Jeton expiré ou révoqué : retour à l'écran de connexion.
    surNonAuthentifie: () => {
      if (jetonActuel.current) fermer();
    },
  });

  // Profil rechargé à chaque connexion, et à la demande (rechargerProfil).
  useEffect(() => {
    if (!jeton) return undefined;
    let actif = true;
    chargerProfil()
      .then((client) => actif && setProfil(client))
      .catch(() => {
        // Sans profil, les écrans affichent simplement moins d'informations.
      });
    return () => {
      actif = false;
    };
  }, [jeton, versionProfil]);

  const rechargerProfil = useCallback(() => setVersionProfil((v) => v + 1), []);

  return (
    <ContexteSession.Provider value={{ jeton, estConnecte: Boolean(jeton), profil, ouvrir, fermer, rechargerProfil }}>
      {children}
    </ContexteSession.Provider>
  );
}

/** `const { estConnecte, profil, ouvrir, fermer } = useSession();` */
export function useSession() {
  return useContext(ContexteSession);
}
