import { Children, isValidElement } from 'react';
import { motion } from 'motion/react';

/**
 * Liste dont les éléments apparaissent l'un après l'autre (envois, box,
 * stations, adresses...). Remplace le <div> qui contient la liste :
 *
 * ```jsx
 * <Cascade className="pile" style={{ gap: 8 }}>
 *   {envois.map((envoi) => <CarteEnvoi key={envoi.id} envoi={envoi} />)}
 * </Cascade>
 * ```
 *
 * Chaque élément est enveloppé dans un <div> animé (classe cascade__element).
 * Seul un élément qui apparaît est animé : une carte déjà affichée ne rejoue
 * rien quand la liste se met à jour.
 */
const DELAI = 0.045; // secondes entre deux éléments
const DELAI_MAX = 0.36; // à partir du 9e élément, plus d'attente supplémentaire

export function Cascade({ children, className = '', style }) {
  return (
    <div className={className} style={style}>
      {Children.map(children, (enfant, rang) =>
        isValidElement(enfant) ? (
          <motion.div
            className="cascade__element"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0, 0, 1], delay: Math.min(rang * DELAI, DELAI_MAX) }}
          >
            {enfant}
          </motion.div>
        ) : (
          enfant
        ),
      )}
    </div>
  );
}
