import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';

/**
 * Cartes OpenStreetMap (gratuit, sans clé d'API), comme carte_osm.dart.
 *
 * Pour la production, prévoir un fournisseur de tuiles avec un contrat : les
 * serveurs publics d'OpenStreetMap limitent l'usage intensif.
 */

/** Centre par défaut : Plateau, Abidjan. */
export const ABIDJAN = [5.3364, -4.0267];

/**
 * Carte avec le fond OpenStreetMap.
 * `fixe` : carte d'aperçu, sans déplacement ni zoom.
 */
export function CarteOsm({ centre = ABIDJAN, zoom = 13, fixe = false, className = '', style, children }) {
  return (
    <MapContainer
      center={centre}
      zoom={zoom}
      className={`carte-osm ${className}`}
      style={style}
      zoomControl={!fixe}
      dragging={!fixe}
      scrollWheelZoom={!fixe}
      doubleClickZoom={!fixe}
      touchZoom={!fixe}
      keyboard={!fixe}
      attributionControl
    >
      <TileLayer
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        maxZoom={19}
      />
      {children}
    </MapContainer>
  );
}

/**
 * Cadre la carte sur tous les `points` ([lat, lng]) ; sur un seul point, la
 * centre. Se relance quand la liste change (filtre, recherche...).
 */
export function Cadrage({ points, marge = 32, zoomMax = 15 }) {
  const carte = useMap();
  const cle = JSON.stringify(points);

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      carte.setView(points[0], Math.min(zoomMax, Math.max(carte.getZoom(), 14)));
    } else {
      carte.fitBounds(L.latLngBounds(points), { padding: [marge, marge], maxZoom: zoomMax });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cle]);

  return null;
}

/** Recalcule la taille de la carte quand son conteneur change (fenêtre, panneau). */
export function AjustementTaille() {
  const carte = useMap();
  useEffect(() => {
    const observateur = new ResizeObserver(() => carte.invalidateSize());
    observateur.observe(carte.getContainer());
    return () => observateur.disconnect();
  }, [carte]);
  return null;
}

// --- Repères (marqueurs) dessinés en HTML, aux couleurs des maquettes ---

/** Tracés SVG (24 x 24, trait) des icônes posées dans les repères. */
const TRACES = {
  maison: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/>',
  drapeau: '<path d="M5 21V4"/><path d="M5 4h12l-2 4 2 4H5"/>',
  livreur: '<circle cx="6" cy="17" r="3"/><circle cx="18" cy="17" r="3"/><path d="M6 17h6l3-7h3M9 10h4"/>',
  point: '<circle cx="12" cy="12" r="4"/>',
  epingle: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  box: '<path d="m21 8-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
};

function svg(trace, taille, couleur) {
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="${couleur}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${TRACES[trace]}</svg>`;
}

/** Rond coloré bordé de blanc, avec une icône (collecte, livraison, livreur). */
export function iconeRepere(trace, couleur = '#121212') {
  return L.divIcon({
    className: 'repere-carte',
    html: `<span class="repere-rond" style="background:${couleur}">${svg(trace, 18, '#fff')}</span>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

/** Épingle noire en goutte avec un point orange (adresse choisie). */
export function iconeEpingle() {
  return L.divIcon({
    className: 'repere-carte',
    html: '<span class="repere-epingle"><span></span></span>',
    iconSize: [40, 48],
    iconAnchor: [20, 46],
  });
}

/** Station : rond blanc bordé de noir, ou noir une fois choisie. */
export function iconeStation(choisie) {
  const fond = choisie ? '#121212' : '#fff';
  const trait = choisie ? '#fff' : '#121212';
  return L.divIcon({
    className: 'repere-carte',
    html: `<span class="repere-station" style="background:${fond};border-color:${trait}">${svg('epingle', 15, trait)}</span>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
}

/** Pilule « (box) 6 » : un entrepôt et son nombre de box libres. */
export function iconeEntrepot(libres, choisi) {
  const couleur = choisi ? '#fff' : '#121212';
  return L.divIcon({
    className: 'repere-carte',
    html: `<span class="repere-entrepot${choisi ? ' repere-entrepot--choisi' : ''}">${svg('box', 13, couleur)}<b>${libres}</b></span>`,
    iconSize: [64, 30],
    iconAnchor: [32, 15],
  });
}

/** Point orange entouré d'un halo : le client. */
export function iconeClient() {
  return L.divIcon({
    className: 'repere-carte',
    html: '<span class="repere-client"><span></span></span>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

/** Distance à vol d'oiseau en kilomètres entre deux points [lat, lng]. */
export function distanceKm([lat1, lng1], [lat2, lng2]) {
  const rayon = 6371;
  const radians = (degres) => (degres * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * rayon * Math.asin(Math.sqrt(a));
}
