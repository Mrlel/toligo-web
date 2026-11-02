/*
 * Service worker de Tôligo : rend l'application installable et permet de
 * l'ouvrir sans réseau (l'écran s'affiche, les données arrivent au retour du
 * réseau).
 *
 * Règles :
 * - l'API n'est JAMAIS mise en cache (données personnelles, toujours fraîches) ;
 * - pages : réseau d'abord, sinon la coquille de l'application en cache ;
 * - fichiers de l'application (JS, CSS, images, polices) : cache d'abord.
 *
 * Changer VERSION à chaque modification de ce fichier : l'ancien cache est
 * alors supprimé.
 */
const VERSION = 'toligo-v1';

const COQUILLE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.svg',
  '/icones/icone-192.png',
  '/icones/icone-512.png',
  '/illustrations/camion.png',
  '/illustrations/coffre.png',
  '/illustrations/colis-petit.png',
  '/illustrations/colis-moyen.png',
  '/illustrations/colis-grand.png',
  '/illustrations/etagere.png',
  '/illustrations/parachute.png',
];

self.addEventListener('install', (evenement) => {
  evenement.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(COQUILLE)));
  self.skipWaiting();
});

self.addEventListener('activate', (evenement) => {
  evenement.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((cle) => cle !== VERSION).map((cle) => caches.delete(cle))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evenement) => {
  const requete = evenement.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  const memeOrigine = url.origin === self.location.origin;
  const police = url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';

  // API, cartes, paiement... : on laisse passer sans rien garder.
  if (!memeOrigine && !police) return;
  if (memeOrigine && url.pathname.startsWith('/api')) return;

  // Navigation (ouverture d'une page) : réseau d'abord, coquille sinon.
  if (requete.mode === 'navigate') {
    evenement.respondWith(fetch(requete).catch(() => caches.match('/index.html')));
    return;
  }

  // Fichiers : cache d'abord, puis réseau (et on garde la copie).
  evenement.respondWith(
    caches.match(requete).then(
      (enCache) =>
        enCache ||
        fetch(requete).then((reponse) => {
          if (reponse.ok || reponse.type === 'opaque') {
            const copie = reponse.clone();
            caches.open(VERSION).then((cache) => cache.put(requete, copie));
          }
          return reponse;
        }),
    ),
  );
});
