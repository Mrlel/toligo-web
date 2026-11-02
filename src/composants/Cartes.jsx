import { motion } from 'motion/react';
import { Info } from 'lucide-react';

// Retour au toucher sur ce qui est cliquable : léger enfoncement.
const APPUI_CARTE = { scale: 0.985 };
const APPUI_OPTION = { scale: 0.98 };

/**
 * Propriétés qui rendent un bloc cliquable au clavier comme à la souris.
 *
 * On n'utilise pas <button> pour une carte entière : elle contient souvent
 * elle-même un bouton (« Changer »), et un bouton dans un bouton est interdit.
 */
export function cliquable(onClick) {
  if (!onClick) return {};
  return {
    role: 'button',
    tabIndex: 0,
    onClick,
    onKeyDown: (evenement) => {
      if (evenement.target !== evenement.currentTarget) return;
      if (evenement.key === 'Enter' || evenement.key === ' ') {
        evenement.preventDefault();
        onClick(evenement);
      }
    },
  };
}

/** Carte blanche à bord fin et ombre douce (cartes « En cours » des maquettes). */
export function Carte({ children, onClick, ombre = true, sansMarge = false, className = '', style }) {
  const classes = ['carte'];
  if (!ombre) classes.push('carte--sans-ombre');
  if (sansMarge) classes.push('carte--sans-marge');
  if (className) classes.push(className);
  return (
    <motion.div className={classes.join(' ')} style={style} whileTap={onClick ? APPUI_CARTE : undefined} {...cliquable(onClick)}>
      {children}
    </motion.div>
  );
}

/** Bloc gris arrondi (récapitulatifs, encadrés). */
export function BlocGris({ children, onClick, className = '', style }) {
  return (
    <motion.div className={`bloc-gris ${className}`} style={style} whileTap={onClick ? APPUI_CARTE : undefined} {...cliquable(onClick)}>
      {children}
    </motion.div>
  );
}

/** Encadré d'information (icône + texte), comme « Votre colis est pesé à la station... ». */
export function EncadreInfo({ children, icone: Icone = Info, accent = false, className = '' }) {
  return (
    <div className={`encadre-info${accent ? ' encadre-info--accent' : ''} ${className}`}>
      <Icone size={18} aria-hidden="true" />
      <div className="extensible">{children}</div>
    </div>
  );
}

/** Ligne « libellé ......... valeur » des récapitulatifs. */
export function LigneInfo({ libelle, valeur, valeurClasse = '', onClick, children }) {
  return (
    <div className="ligne-info" {...cliquable(onClick)} style={onClick ? { cursor: 'pointer' } : undefined}>
      <span className="ligne-info__libelle">{libelle}</span>
      <span className={`ligne-info__valeur ${valeurClasse}`}>{valeur}</span>
      {children}
    </div>
  );
}

/**
 * Rond de sélection : anneau noir épais quand il est actif, cercle gris sinon.
 * L'anneau s'épaissit avec un petit rebond au moment du choix.
 */
export function RondSelection({ actif }) {
  return (
    <motion.span
      className={`rond-selection${actif ? ' rond-selection--actif' : ''}`}
      aria-hidden="true"
      initial={false}
      animate={{ borderWidth: actif ? 7 : 2 }}
      transition={{ type: 'spring', stiffness: 600, damping: 26 }}
    />
  );
}

/**
 * Option sélectionnable (format, mode de paiement, station...).
 *
 * Blanche avec un bord fin et une ombre douce ; une fois choisie, bord noir
 * de 2 px sur fond gris très clair.
 */
export function Option({
  choisie,
  onClick,
  children,
  desactivee = false,
  indicateur = true,
  plate = false,
  className = '',
  style,
}) {
  const classes = ['option'];
  if (choisie) classes.push('option--choisie');
  if (plate) classes.push('option--plate');
  if (className) classes.push(className);

  return (
    <motion.button
      type="button"
      className={classes.join(' ')}
      style={style}
      onClick={onClick}
      disabled={desactivee}
      aria-pressed={choisie}
      whileTap={APPUI_OPTION}
    >
      <div className="option__contenu">{children}</div>
      {indicateur && <RondSelection actif={choisie} />}
    </motion.button>
  );
}
