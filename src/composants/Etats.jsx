import { AlertCircle, Inbox, WifiOff } from 'lucide-react';

import { ApiErreur, messageErreur } from '../api/client';
import { Roue } from './Boutons';

/** Roue de chargement centrée. */
export function Chargement({ message }) {
  return (
    <div className="etat">
      <Roue taille="grande" />
      {message && <p className="etat__message">{message}</p>}
    </div>
  );
}

/** Message d'erreur avec bouton « Réessayer ». */
export function VueErreur({ erreur, onReessayer }) {
  const horsLigne = erreur instanceof ApiErreur && erreur.estHorsLigne;
  const Icone = horsLigne ? WifiOff : AlertCircle;
  return (
    <div className="etat" role="alert">
      <Icone size={40} color="var(--texte-discret)" aria-hidden="true" />
      <p className="etat__message" style={{ fontSize: 15 }}>
        {messageErreur(erreur)}
      </p>
      {onReessayer && (
        <button type="button" className="bouton-reessayer" onClick={onReessayer}>
          Réessayer
        </button>
      )}
    </div>
  );
}

/** État vide (« Aucun envoi pour le moment »). */
export function VueVide({ titre, message, icone: Icone = Inbox, action }) {
  return (
    <div className="etat">
      <span className="etat__icone">
        <Icone size={30} aria-hidden="true" />
      </span>
      <p className="etat__titre">{titre}</p>
      {message && <p className="etat__message">{message}</p>}
      {action && <div className="etat__action">{action}</div>}
    </div>
  );
}

/**
 * Affiche une donnée chargée avec useDonnees : roue, erreur ou contenu.
 *
 * ```jsx
 * <VueDonnees etat={adresses}>{(liste) => ...}</VueDonnees>
 * ```
 */
export function VueDonnees({ etat, children, messageChargement }) {
  if (etat.erreur) return <VueErreur erreur={etat.erreur} onReessayer={etat.recharger} />;
  if (etat.donnees === undefined) return <Chargement message={messageChargement} />;
  return children(etat.donnees);
}
