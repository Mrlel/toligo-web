import { useCallback, useEffect, useState } from 'react';

/**
 * Charge une donnée depuis l'API et suit son état.
 *
 * ```js
 * const adresses = useDonnees(() => listerAdresses(), []);
 * // adresses.donnees, adresses.erreur, adresses.chargement, adresses.recharger()
 * ```
 *
 * Le chargement est relancé quand une valeur de `dependances` change, ou à
 * l'appel de `recharger()`. Pendant un rechargement, les données précédentes
 * restent affichées.
 */
export function useDonnees(chargeur, dependances = []) {
  const [etat, setEtat] = useState({ donnees: undefined, erreur: null, chargement: true });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let actif = true;
    setEtat((precedent) => ({ ...precedent, erreur: null, chargement: true }));

    chargeur().then(
      (donnees) => actif && setEtat({ donnees, erreur: null, chargement: false }),
      (erreur) => actif && setEtat({ donnees: undefined, erreur, chargement: false }),
    );

    // Écran quitté avant la réponse : on ignore le résultat.
    return () => {
      actif = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependances, version]);

  const recharger = useCallback(() => setVersion((v) => v + 1), []);

  return { ...etat, recharger };
}
