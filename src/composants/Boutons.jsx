import { motion } from 'motion/react';
import { ArrowLeft, Plus, X } from 'lucide-react';

// Retour au toucher : le bouton s'enfonce légèrement tant qu'on appuie
// (Motion l'ignore sur un bouton désactivé).
const APPUI = { scale: 0.97 };
const APPUI_ROND = { scale: 0.92 };

/** Roue de chargement. `taille` : 'petite', 'normale' ou 'grande'. */
export function Roue({ taille = 'normale', className = '' }) {
  const classe = taille === 'normale' ? '' : ` roue--${taille}`;
  return <span className={`roue${classe} ${className}`} role="status" aria-label="Chargement" />;
}

/**
 * Bouton pleine largeur en forme de pilule (56 px de haut).
 *
 * Variantes des maquettes : 'principal' (noir), 'accent' (orange, paiement),
 * 'secondaire' (gris clair), 'contour' (blanc bordé), 'texte' (sans fond),
 * 'danger' (texte rouge), 'contour-danger' (blanc bordé, texte rouge).
 *
 * Passer `enCours` pendant un appel réseau : le bouton affiche une roue et
 * ignore les clics, ce qui évite les doubles envois.
 */
export function Bouton({
  children,
  variante = 'principal',
  enCours = false,
  icone: Icone,
  compact = false,
  className = '',
  type = 'button',
  disabled,
  ...reste
}) {
  const classes = ['bouton', `bouton--${variante}`];
  if (enCours) classes.push('bouton--en-cours');
  if (compact) classes.push('bouton--compact');
  if (className) classes.push(className);

  return (
    <motion.button
      type={type}
      className={classes.join(' ')}
      disabled={disabled || enCours}
      aria-busy={enCours || undefined}
      whileTap={APPUI}
      {...reste}
    >
      {enCours ? (
        <Roue />
      ) : (
        <>
          {Icone && <Icone size={20} aria-hidden="true" />}
          <span>{children}</span>
        </>
      )}
    </motion.button>
  );
}

/** Petit bouton gris en pilule, à droite d'une carte : « Changer », « Modifier ». */
export function PetitBouton({ children, onClick, className = '', ...reste }) {
  return (
    <motion.button
      type="button"
      className={`petit-bouton ${className}`}
      onClick={(evenement) => {
        // Le bouton est souvent posé sur une carte elle-même cliquable.
        evenement.stopPropagation();
        onClick?.(evenement);
      }}
      whileTap={APPUI_ROND}
      // La carte en dessous ne s'enfonce pas en même temps.
      propagate={{ tap: false }}
      {...reste}
    >
      {children}
    </motion.button>
  );
}

/**
 * Bouton rond de 44 px. Par défaut : flèche de retour.
 * `apparence` : 'blanc' (bordé), 'gris', 'noir' ou 'flottant' (ombre, sur une carte).
 */
export function BoutonRond({ onClick, icone: Icone = ArrowLeft, libelle = 'Retour', apparence = 'blanc', taille = 22, ...reste }) {
  const classe = apparence === 'blanc' ? '' : ` bouton-rond--${apparence}`;
  return (
    <motion.button
      type="button"
      className={`bouton-rond${classe}`}
      onClick={onClick}
      aria-label={libelle}
      title={libelle}
      whileTap={APPUI_ROND}
      propagate={{ tap: false }}
      {...reste}
    >
      <Icone size={taille} aria-hidden="true" />
    </motion.button>
  );
}

/** Bouton de fermeture (croix) : un BoutonRond gris. */
export function BoutonFermer({ onClick, libelle = 'Fermer' }) {
  return <BoutonRond icone={X} libelle={libelle} apparence="gris" onClick={onClick} />;
}

/** Bouton pleine largeur bordé de pointillés : « + Ajouter un autre destinataire ». */
export function BoutonAjout({ children, onClick, hauteur = 50, icone: Icone = Plus }) {
  return (
    <motion.button type="button" className="bouton-ajout" style={{ height: hauteur }} onClick={onClick} whileTap={APPUI}>
      <Icone size={18} aria-hidden="true" />
      <span className="une-ligne">{children}</span>
    </motion.button>
  );
}
