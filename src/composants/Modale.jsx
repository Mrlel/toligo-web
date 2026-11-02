import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';

import { BoutonFermer } from './Boutons';

// Fenêtres ouvertes, de la plus ancienne à la plus récente : Échap ne ferme
// que celle du dessus (une recherche de lieu ouverte depuis un formulaire...).
const pile = [];

/**
 * Fenêtre par-dessus l'écran : boîte centrée sur ordinateur, feuille qui
 * monte du bas sur téléphone (comme les « bottom sheets » du mobile).
 *
 * Ouverture et fermeture animées : le fond s'assombrit, la fenêtre glisse.
 * Pendant la fermeture, elle garde le contenu qu'elle avait (AnimatePresence
 * conserve le dernier rendu), même si la page l'a déjà effacé.
 *
 * - `ouverte` / `onFermer` : affichage et fermeture (Échap, clic à côté, croix) ;
 * - `pied` : boutons en bas de la fenêtre ;
 * - `large` : 640 px au lieu de 460 ; `haute` : hauteur fixe (listes, carte).
 */
export function Modale({ ouverte, onFermer, titre, children, pied, large = false, haute = false, sansCroix = false }) {
  const fenetre = useRef(null);
  const id = useId();

  // La page derrière ne défile plus tant qu'une fenêtre est ouverte.
  useEffect(() => {
    if (!ouverte) return undefined;
    pile.push(id);
    document.body.style.overflow = 'hidden';
    return () => {
      pile.splice(pile.indexOf(id), 1);
      if (pile.length === 0) document.body.style.overflow = '';
    };
  }, [ouverte, id]);

  // Échap ferme la fenêtre du dessus.
  useEffect(() => {
    if (!ouverte) return undefined;
    const surTouche = (evenement) => {
      if (evenement.key === 'Escape' && pile[pile.length - 1] === id) onFermer?.();
    };
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [ouverte, onFermer, id]);

  // Le focus clavier passe dans la fenêtre à l'ouverture.
  useEffect(() => {
    if (!ouverte) return;
    const cible = fenetre.current?.querySelector('input, textarea, [data-focus-initial]') ?? fenetre.current;
    cible?.focus();
  }, [ouverte]);

  const classes = ['modale'];
  if (large) classes.push('modale--large');
  if (haute) classes.push('modale--haute');

  // Téléphone : la feuille part du bas de l'écran. Ordinateur : la boîte
  // apparaît en fondu, un peu plus bas que sa place.
  const feuille = window.matchMedia('(max-width: 640px)').matches;
  const depart = feuille ? { y: '100%' } : { opacity: 0, y: 24, scale: 0.98 };

  return createPortal(
    <AnimatePresence>
      {ouverte && (
        <motion.div
          className="modale__fond"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.18 } }}
          transition={{ duration: 0.2 }}
          onMouseDown={(evenement) => {
            if (evenement.target === evenement.currentTarget) onFermer?.();
          }}
        >
          <motion.div
            className={classes.join(' ')}
            role="dialog"
            aria-modal="true"
            aria-label={titre}
            ref={fenetre}
            tabIndex={-1}
            initial={depart}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ ...depart, transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
            transition={{ type: 'spring', stiffness: 420, damping: 38 }}
          >
            {(titre || !sansCroix) && (
              <div className="modale__entete">
                <h2 className="modale__titre">{titre}</h2>
                {!sansCroix && onFermer && <BoutonFermer onClick={onFermer} />}
              </div>
            )}
            <div className="modale__corps">{children}</div>
            {pied && <div className="modale__pied">{pied}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
