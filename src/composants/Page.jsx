import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

import { BoutonRond } from './Boutons';

/**
 * Revenir à l'écran précédent ; si l'on est arrivé directement sur la page
 * (lien partagé, rechargement), aller à `repli`.
 */
export function useRetour(repli = '/accueil') {
  const naviguer = useNavigate();
  return () => {
    // React Router numérote les entrées de l'historique (idx 0 = arrivée).
    if ((window.history.state?.idx ?? 0) > 0) naviguer(-1);
    else naviguer(repli, { replace: true });
  };
}

/**
 * Gabarit d'un écran : en-tête en haut, contenu centré, pied d'action fixé
 * en bas.
 *
 * - `titre` : titre de l'onglet du navigateur (« Mes envois · Tôligo ») ;
 * - `largeur` : 'etroite' (640 px, formulaires), 'moyenne' (880 px) ou
 *   'large' (1120 px, listes et tableaux de bord) ;
 * - `fond` : couleur de fond de l'écran (variable CSS), blanc par défaut.
 */
export function Page({ titre, entete, pied, largeur = 'etroite', fond, className = '', children }) {
  useEffect(() => {
    document.title = titre ? `${titre} · Tôligo` : 'Tôligo';
  }, [titre]);

  const classes = ['page', `page--${largeur}`];
  if (!entete) classes.push('page--sans-entete');
  if (className) classes.push(className);

  return (
    <div className={classes.join(' ')} style={fond ? { '--fond-page': fond } : undefined}>
      {entete && (
        <header className="page__entete">
          <div className="page__limite">{entete}</div>
        </header>
      )}
      <main className="page__corps page__limite">{children}</main>
      {pied && (
        <div className="page__pied">
          <div className="page__limite">{pied}</div>
        </div>
      )}
    </div>
  );
}

/**
 * Barre du haut des écrans secondaires : bouton retour (ou fermer) à gauche,
 * titre centré, sous-titre facultatif, actions à droite.
 *
 * Deux styles de bouton retour, comme dans les maquettes : blanc bordé (par
 * défaut) ou gris sans bordure (`gris`, parcours d'envoi et connexion).
 */
export function EnTete({ titre, sousTitre, fermer = false, gris = false, onRetour, repli, sansRetour = false, actions, actionsLarges = false }) {
  const retour = useRetour(repli);
  return (
    <div className={`entete${actionsLarges ? ' entete--actions-larges' : ''}`}>
      <div>
        {!sansRetour && (
          <BoutonRond
            icone={fermer ? X : undefined}
            libelle={fermer ? 'Fermer' : 'Retour'}
            apparence={gris ? 'gris' : 'blanc'}
            onClick={onRetour ?? retour}
          />
        )}
      </div>
      <div className="entete__titre">
        {titre && <h1>{titre}</h1>}
        {sousTitre && <p>{sousTitre}</p>}
      </div>
      <div className="entete__actions">{actions}</div>
    </div>
  );
}

/** Grand titre des écrans principaux (« Mes envois ») avec une action à droite. */
export function TitreEcran({ children, action }) {
  return (
    <div className="titre-ecran">
      <h1>{children}</h1>
      {action}
    </div>
  );
}

/**
 * Zone fixée en bas d'écran pour le ou les boutons d'action.
 *
 * Deux styles dans les maquettes : séparée par un trait fin (par défaut), ou
 * arrondie en haut avec une ombre (`arrondi`, parcours d'envoi, paiement).
 * `entete` : ligne au-dessus des boutons (« 2 colis · 2 500 F »).
 */
export function PiedDAction({ children, entete, arrondi = false }) {
  return (
    <div className={`pied${arrondi ? ' pied--arrondi' : ''}`}>
      {entete && <div className="pied__entete">{entete}</div>}
      {children}
    </div>
  );
}
