import { useState } from 'react';
import { Package } from 'lucide-react';

import { initiales } from '../utils/formatage';

/**
 * Couleurs des avatars des destinataires : chacun garde la sienne d'un écran
 * à l'autre (orange, vert, gris, puis on recommence).
 */
const TEINTES = [
  ['var(--accent-clair)', 'var(--accent-fonce)'],
  ['var(--succes-clair)', 'var(--succes-fonce)'],
  ['var(--surface-alt)', 'var(--encre)'],
];

export function teinteDuRang(rang) {
  return TEINTES[rang % TEINTES.length];
}

/** Rond avec les initiales d'une personne (« AK »). */
export function AvatarInitiales({ nom, taille = 44, rang = null, accent = false, fond, couleur }) {
  let [teinteFond, teinteTexte] = rang !== null ? teinteDuRang(rang) : accent ? TEINTES[0] : TEINTES[2];
  if (fond) teinteFond = fond;
  if (couleur) teinteTexte = couleur;
  return (
    <span
      className="avatar"
      style={{ width: taille, height: taille, background: teinteFond, color: teinteTexte, fontSize: taille * 0.34 }}
      aria-hidden="true"
    >
      {initiales(nom)}
    </span>
  );
}

/** Barre de progression d'un parcours en étapes (« 1. Adresses · 2. Colis... »). */
export function BarreEtapes({ etapes, courante }) {
  return (
    <div className="etapes" aria-label={`Étape ${courante + 1} sur ${etapes.length}`}>
      {etapes.map((etape, i) => (
        <div className="etapes__etape" key={etape}>
          <div className={`etapes__trait${i <= courante ? ' etapes__trait--fait' : ''}`} />
          <div
            className={`etapes__libelle${i === courante ? ' etapes__libelle--courant' : i < courante ? ' etapes__libelle--passe' : ''}`}
          >
            {i + 1}. {etape}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Barre de progression fine (accueil : « 4/6 »). `valeur` entre 0 et 1. */
export function BarreProgression({ valeur }) {
  const pourcentage = Math.max(0, Math.min(1, valeur)) * 100;
  return (
    <div className="progression" role="progressbar" aria-valuenow={Math.round(pourcentage)} aria-valuemin={0} aria-valuemax={100}>
      <div className="progression__barre" style={{ width: `${pourcentage}%` }} />
    </div>
  );
}

/** Progression en segments : étapes faites en noir, étape en cours en orange. */
export function ProgressionSegmentee({ position, total }) {
  return (
    <div className="segments-progression" aria-label={`Étape ${position} sur ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i < position - 1 ? 'fait' : i === position - 1 ? 'courant' : ''} />
      ))}
    </div>
  );
}

/**
 * Illustration des maquettes (camion, colis, coffre...), lue dans
 * public/illustrations. Affiche une icône de remplacement si l'image manque.
 *
 * `carre` : image contenue dans un carré de `taille` ; sinon `taille` est la
 * largeur et la hauteur suit les proportions (comme `width: 104px` des maquettes).
 */
export function Illustration({ nom, taille = 64, carre = true, className = '', style }) {
  const [enErreur, setEnErreur] = useState(false);

  if (enErreur) {
    return (
      <span
        className={`illustration-secours ${className}`}
        style={{ width: taille, height: taille, borderRadius: taille * 0.28, ...style }}
        aria-hidden="true"
      >
        <Package size={taille * 0.5} />
      </span>
    );
  }

  return (
    <img
      src={`/illustrations/${nom}.png`}
      alt=""
      className={`illustration ${className}`}
      style={{ width: taille, height: carre ? taille : 'auto', ...style }}
      onError={() => setEnErreur(true)}
      draggable={false}
    />
  );
}

/** Icône « Mes box » des maquettes : un box carré avec sa serrure. */
export function IconeBox({ size = 22, strokeWidth = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <circle cx="12" cy="10.5" r="2.2" />
      <path d="M12 12.7v3.3" />
    </svg>
  );
}

/** Icône de drone des maquettes : quatre hélices autour d'un corps carré. */
export function IconeDrone({ taille = 20, couleur = 'currentColor' }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="5" cy="5" r="2.5" />
      <circle cx="19" cy="5" r="2.5" />
      <circle cx="5" cy="19" r="2.5" />
      <circle cx="19" cy="19" r="2.5" />
      <path d="M7 7l3 3M17 7l-3 3M7 17l3-3M17 17l-3-3" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  );
}
