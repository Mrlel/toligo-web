import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Styles communs d'abord : les styles des écrans, importés par App, passent
// après et peuvent les préciser.
import './styles/theme.css';
import './styles/composants.css';
import './styles/mise-en-page.css';
import 'leaflet/dist/leaflet.css';
import './styles/carte.css';
import './styles/scenes.css';
import './styles/utilitaires.css';
import App from './App';

// Le retour en haut de page est géré par l'application (commun/EcransAnimes.jsx) :
// le navigateur ne doit pas faire défiler l'écran qui part, au retour arrière.
if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';

/** Point d'entrée de l'application web client Tôligo. */
createRoot(document.getElementById('racine')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Application installable (PWA) : service worker public/sw.js, en production
// seulement (en développement, il gênerait le rechargement à chaud de Vite).
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sans service worker, l'application marche quand même (pas de mode hors ligne).
    });
  });
}
