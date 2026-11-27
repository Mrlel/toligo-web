import { Copy, Navigation, Warehouse } from 'lucide-react';

import { useMessages } from '../../composants';
import { jourEtHeure } from '../../utils/formatage';
import './envoi.css';

/**
 * Code de dépôt d'une commande (audit §24, mise à jour du 26/11/2026).
 *
 * Le client se présente à l'entrepôt avec ses colis et donne ce code au
 * gestionnaire, qui les pèse, les mesure et fixe le prix réel. Un seul code
 * pour toute la commande, valable 48 h : passé ce délai, l'envoi expire et
 * peut être réactivé.
 *
 * `site` : l'entrepôt où se présenter (nom, adresse, coordonnées).
 */
export function CodeReception({ code, expireLe, site }) {
  const { afficherMessage } = useMessages();
  const itineraire =
    site?.latitude !== null && site?.latitude !== undefined && site?.longitude !== null && site?.longitude !== undefined
      ? `https://www.google.com/maps/search/?api=1&query=${site.latitude},${site.longitude}`
      : null;

  async function copier() {
    try {
      await navigator.clipboard.writeText(code);
      afficherMessage('Code de dépôt copié.');
    } catch {
      afficherMessage(`Code de dépôt : ${code}`);
    }
  }

  return (
    <div className="code-reception">
      <p className="code-reception__libelle">Code de dépôt</p>
      <div className="code-reception__ligne">
        <span className="code-reception__code">{code}</span>
        <button type="button" className="code-suivi" onClick={copier} title="Copier le code de dépôt" aria-label="Copier le code de dépôt">
          <Copy size={14} />
        </button>
      </div>
      {expireLe && <p className="code-reception__validite">Valable jusqu’au {jourEtHeure(expireLe)}</p>}

      {site && (
        <div className="code-reception__site">
          <Warehouse size={18} aria-hidden="true" />
          <div className="extensible">
            <p className="demi-gras">{site.nom}</p>
            {site.adresse && <p className="texte-secondaire">{site.adresse}</p>}
          </div>
          {itineraire && (
            <a className="code-suivi" href={itineraire} target="_blank" rel="noreferrer">
              <Navigation size={14} aria-hidden="true" /> Y aller
            </a>
          )}
        </div>
      )}

    </div>
  );
}
