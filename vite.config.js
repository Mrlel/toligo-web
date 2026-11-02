import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Adresse de l'API Laravel sur ce PC (php artisan serve), quand API_CIBLE
// n'est pas renseignée.
const API_LOCALE = 'http://127.0.0.1:8000';

// Port 5173 : c'est l'adresse que le backend autorise par défaut (CORS,
// CORS_ALLOWED_ORIGINS dans toligo/.env).
//
// host: true rend l'application joignable depuis un téléphone sur le même
// Wi-Fi (http://<ip-du-pc>:5173). Attention : hors de localhost, le
// navigateur refuse la géolocalisation et le service worker sans HTTPS.
export default defineConfig(({ mode }) => {
  // Proxy : en développement, l'application appelle sa propre adresse
  // (/api/...) et Vite transmet à l'API désignée par API_CIBLE (fichier
  // .env.development : la prod). Ainsi :
  // - pas de blocage CORS, même ouverte par l'adresse réseau (192.168.x.x) ;
  // - un téléphone sur le même Wi-Fi joint l'API à travers le PC.
  const cible = loadEnv(mode, process.cwd(), '').API_CIBLE || API_LOCALE;
  const proxy = { '/api': { target: cible, changeOrigin: true } };

  return {
    plugins: [react()],
    server: { port: 5173, host: true, proxy },
    preview: { port: 4173, host: true, proxy },
  };
});
