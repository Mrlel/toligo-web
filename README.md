# Tôligo — application web client (React)

Version web de l'application client Tôligo : envoi de colis et location de box.
Elle reprend les maquettes `toligo/docs/mockups/client` et l'identité visuelle de
l'application mobile (`toligo_mobile`) : mêmes couleurs, polices (Sora, DM Sans),
arrondis et illustrations. Elle utilise la même API Laravel (`../toligo`).

- **Sur téléphone** (moins de 960 px de large) : elle se présente comme l'app
  mobile, avec les onglets en bas (Accueil, Envois, Mes box, Profil).
- **Sur ordinateur** : la navigation passe dans une barre à gauche ; les listes
  passent sur deux colonnes, la carte du suivi occupe la gauche de l'écran.

## Lancer l'application

Double-cliquer sur `lancer-app-web.bat` : le navigateur s'ouvre sur
<http://localhost:5173>. L'app utilise l'API de prod
(<https://toligo.wimostore.com>, serveur de test Hostinger).

Ou, dans un terminal :

```
npm install      (la première fois)
npm run dev      (développement, rechargement automatique)
```

En développement, l'app appelle `/api` sur sa propre adresse et le serveur Vite
relaie vers l'API désignée par `API_CIBLE` dans `.env.development` (la prod).
Elle marche donc aussi depuis un téléphone sur le même Wi-Fi, via l'adresse
réseau affichée par Vite, sans réglage CORS côté Laravel. Pour travailler avec
l'API lancée sur ce PC (`php artisan serve` dans le dossier `toligo`), mettre
`API_CIBLE=http://127.0.0.1:8000`.

La version de production (`npm run build`) appelle directement
`https://toligo.wimostore.com/api` (`VITE_API_URL` dans `.env.production`) :
l'API doit autoriser l'adresse où le site est publié (`CORS_ALLOWED_ORIGINS`
dans le `.env` de Laravel).

### Version de production et installation (PWA)

```
npm run build      (crée le dossier dist/)
npm run preview    (sert dist/ sur http://localhost:4173)
```

En production, l'app est installable (Chrome propose « Installer Tôligo ») et
garde sa coquille hors ligne (`public/sw.js`, `public/manifest.webmanifest`).
Sur un téléphone, il faut du HTTPS (sauf `localhost`) pour l'installation et
pour la géolocalisation (« Utiliser ma position actuelle »).

> Si vous ajoutez ou renommez une image de `public/illustrations/`, mettez à
> jour la liste `COQUILLE` de `public/sw.js` et changez sa `VERSION`.

## Organisation du code

Le découpage suit celui de l'app mobile, pour passer facilement de l'une à
l'autre :

| Web (`src/`) | Mobile (`toligo_mobile/`) | Rôle |
|---|---|---|
| `api/client.js` | `toligo_core/.../api_client.dart` | Appels HTTP, jeton, enveloppe `{ success, data, message }`, erreurs |
| `session/Session.jsx` | `toligo_core/.../session.dart` | Jeton de connexion et profil du client |
| `styles/theme.css` | `toligo_core/.../couleurs.dart`, `theme.dart` | Couleurs, polices, arrondis |
| `composants/` | `toligo_core/.../widgets/` | Boutons, champs, cartes, pastilles, fenêtres… |
| `commun/routes.js` | `routeur.dart` | Adresses de tous les écrans |
| `fonctionnalites/<nom>/api.js` | `fonctionnalites/<nom>/<nom>.dart` (dépôts) | Appels d'API d'une fonctionnalité |
| `fonctionnalites/<nom>/<Ecran>Page.jsx` | `fonctionnalites/<nom>/<ecran>_ecran.dart` | Un écran |

Les visiteurs arrivent sur la page publique (`/`,
`fonctionnalites/vitrine/VitrinePage.jsx`) : présentation de l'envoi de colis
et de la location de box, puis inscription ou connexion. Un client connecté
qui ouvre `/` va directement sur son accueil (`/accueil`).

Chaque écran contient sa propre logique (chargement, validation, envoi), avec
ses petits morceaux d'affichage dans le même fichier. Le parcours « Nouvel
envoi » partage sa saisie entre ses écrans via `fonctionnalites/envoi/EtatEnvoi.jsx`
(gardée dans l'onglet du navigateur : elle survit à un rechargement).

Bibliothèques : React 19, React Router 7, Leaflet (cartes OpenStreetMap),
lucide-react (icônes), Motion (animations). Pas de TypeScript ni de framework
CSS : le style est en CSS simple, avec les variables de `styles/theme.css`.

### Animations (Motion)

- **Entre les écrans** : `commun/EcransAnimes.jsx`, à la place de `<Outlet />`
  dans la coquille et les écrans de connexion. En avançant, l'écran part à
  gauche et le suivant arrive de la droite ; au retour, l'inverse ; entre deux
  onglets principaux, un fondu.
- **Listes** : `<Cascade>` (`composants/Cascade.jsx`) remplace le `<div>` d'une
  liste ; ses éléments apparaissent l'un après l'autre.
- **Fenêtres** : `Modale` monte du bas sur téléphone, avec un fond qui s'assombrit.
- **Toucher** : boutons, cartes cliquables et options s'enfoncent légèrement ;
  le rond de sélection et le fond des onglets segmentés glissent.
- Si le téléphone demande moins d'animations, il ne reste que des fondus
  (`MotionConfig reducedMotion="user"` dans `App.jsx`).

Les versions de Motion sont fixées dans `package.json` (`overrides`). Pour
mettre à jour, changez les quatre numéros ensemble.

## Différences avec l'app mobile

- **Paiement GeniusPay** : la page de paiement s'ouvre dans un nouvel onglet ;
  l'écran Tôligo vérifie le paiement toutes les 15 s (le serveur limite cette
  vérification à 5 appels par minute) et dès qu'on revient sur l'onglet. La page
  `/paiement-check` accueille le retour de GeniusPay.
- **Recherche de lieu, formulaire d'adresse** : dans des fenêtres par-dessus
  l'écran, au lieu d'écrans séparés.
- **Dates (location de box)** : sélecteurs de date et d'heure du navigateur.
- **Lien de suivi partagé** : un client non connecté qui ouvre `/colis/CL-...`
  y est renvoyé après sa connexion.
