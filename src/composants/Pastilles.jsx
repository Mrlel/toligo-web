import { useId } from 'react';
import { motion } from 'motion/react';

const APPUI = { scale: 0.95 };

/**
 * Petite étiquette arrondie (« 6 libres », « En vol », « Livré »).
 * `ton` : 'neutre', 'accent', 'succes', 'erreur', 'sombre' ou 'vive'.
 */
export function Pastille({ children, ton = 'neutre', icone: Icone, petite = false, className = '' }) {
  const classes = ['pastille'];
  if (ton !== 'neutre') classes.push(`pastille--${ton}`);
  if (petite) classes.push('pastille--petite');
  if (className) classes.push(className);
  return (
    <span className={classes.join(' ')}>
      {Icone && <Icone size={petite ? 12 : 14} strokeWidth={2.5} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** Puce sélectionnable : grise, noire une fois choisie. */
export function Puce({ children, choisie, onClick, icone: Icone }) {
  return (
    <motion.button type="button" className={`puce${choisie ? ' puce--choisie' : ''}`} onClick={onClick} aria-pressed={choisie} whileTap={APPUI}>
      {Icone && <Icone size={16} aria-hidden="true" />}
      {children}
    </motion.button>
  );
}

/** Filtre en pilule bordée (« À proximité », « Cocody »). */
export function Filtre({ children, actif, onClick }) {
  return (
    <motion.button type="button" className={`filtre${actif ? ' filtre--actif' : ''}`} onClick={onClick} aria-pressed={actif} whileTap={APPUI}>
      {children}
    </motion.button>
  );
}

/**
 * Onglets en segments sur fond gris (« En cours · 2 | Terminés | Annulés »).
 * `onglets` : liste de { cle, libelle }.
 *
 * Le fond blanc de l'onglet choisi glisse vers le nouvel onglet (layoutId :
 * Motion anime l'élément d'une place à l'autre).
 */
export function OngletsSegmentes({ onglets, courant, onChoisir }) {
  // Propre à ce groupe d'onglets : deux groupes à l'écran ne se mélangent pas.
  const groupe = useId();
  return (
    <div className="segments" role="tablist">
      {onglets.map((onglet) => {
        const actif = onglet.cle === courant;
        return (
          <button
            key={onglet.cle}
            type="button"
            role="tab"
            aria-selected={actif}
            className={`segments__onglet${actif ? ' segments__onglet--actif' : ''}`}
            onClick={() => onChoisir(onglet.cle)}
          >
            {actif && (
              <motion.span
                layoutId={`curseur-${groupe}`}
                className="segments__curseur"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className="segments__libelle">{onglet.libelle}</span>
          </button>
        );
      })}
    </div>
  );
}
