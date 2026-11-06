import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import dns from 'node:dns';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Évite d'essayer plusieurs adresses (IPv6 puis IPv4) à chaque connexion.
dns.setDefaultResultOrder('ipv4first');
net.setDefaultAutoSelectFamily(false);

const API_LOCALE = 'http://127.0.0.1:8000';

export default defineConfig(({ mode }) => {
  const cible = loadEnv(mode, process.cwd(), '').API_CIBLE || API_LOCALE;

  // Réutilise les connexions au lieu d'en ouvrir une par requête.
  const options = { keepAlive: true, maxSockets: 20, maxFreeSockets: 10 };
  const agent = cible.startsWith('https')
    ? new https.Agent(options)
    : new http.Agent(options);

  const proxy = {
    '/api': {
      target: cible,
      changeOrigin: true,
      secure: true,
      agent,
    },
  };

  return {
    plugins: [react()],
    server: { port: 5173, host: true, proxy },
    preview: { port: 4173, host: true, proxy },
  };
});