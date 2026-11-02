import { useEffect } from 'react';

import { BoutonRond, useRetour } from '../../composants';
import { Routes } from '../../commun/routes';
import { SceneCielRoute } from '../../commun/Scenes';
import './authentification.css';

/**
 * Gabarit des écrans de connexion, d'inscription et de code SMS.
 *
 * Sur téléphone : comme l'application mobile (bouton retour, titre,
 * formulaire, bouton d'action collé en bas). Sur ordinateur : l'illustration
 * Tôligo à gauche, le formulaire à droite.
 *
 * - `scene` : illustration du panneau de gauche (ciel et route par défaut) ;
 * - `coin` : petite illustration en haut à droite sur téléphone (parachute) ;
 * - `pied` : bouton(s) d'action ;
 * - `onSoumettre` : appelé par la touche Entrée et par le bouton du pied
 *   qui porte `type="submit" form={ID_FORMULAIRE}`.
 */
export const ID_FORMULAIRE = 'formulaire-auth';

export function CadreAuthentification({ titreDocument, scene = <SceneCielRoute />, coin, onRetour, onSoumettre, pied, children }) {
  const retour = useRetour(Routes.vitrine);

  useEffect(() => {
    document.title = `${titreDocument} · Tôligo`;
  }, [titreDocument]);

  return (
    <div className="auth">
      <aside className="auth__visuel" aria-hidden="true">
        <p className="auth__accroche">
          Le <em>ciel</em> pour aller plus vite, la <em>route</em> pour aller partout.
        </p>
        {scene}
      </aside>

      <div className="auth__panneau">
        {coin && <img className="auth__illustration-coin" src={`/illustrations/${coin}.png`} alt="" />}
        <div>
          <BoutonRond apparence="gris" onClick={onRetour ?? retour} />
        </div>
        <form
          className="auth__corps"
          id={ID_FORMULAIRE}
          noValidate
          onSubmit={(evenement) => {
            evenement.preventDefault();
            onSoumettre?.();
          }}
        >
          {children}
        </form>
        <div className="auth__pied">{pied}</div>
      </div>
    </div>
  );
}
