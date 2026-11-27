import { useCallback, useEffect, useState } from 'react';
import { Sparkles, Warehouse } from 'lucide-react';

import { Cascade, Chargement, Option, VueErreur, VueVide } from '../../composants';
import { distance } from '../../utils/formatage';
import { entrepotsDeDepot } from './api';

/**
 * Choix du lieu de dépôt (§9.1, révision du 26/11/2026) : les entrepôts Tôligo
 * proches de l'adresse d'expédition, du plus proche au plus lointain, distances
 * calculées par le serveur. Le client ne voit plus les stations : celle qui
 * ramasse l'entrepôt est déduite par le serveur.
 *
 * `onChoisir({ site })` est appelé dès qu'un entrepôt est retenu, et
 * `onChoisir(null)` quand l'expéditeur préfère laisser Tôligo décider : le
 * serveur retient alors l'entrepôt le plus proche à la confirmation.
 */
export function ChoixDepot({ position, choix, onChoisir, avecAutomatique = true }) {
  const [sites, setSites] = useState(null);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    setErreur(null);
    setSites(null);
    try {
      setSites(await entrepotsDeDepot(position));
    } catch (e) {
      setErreur(e);
    }
  }, [position.latitude, position.longitude]);

  useEffect(() => {
    charger();
  }, [charger]);

  if (erreur) return <VueErreur erreur={erreur} onReessayer={charger} />;
  if (sites === null) return <Chargement message="Recherche des entrepôts…" />;

  return (
    <Cascade style={{ marginTop: 12 }}>
      {avecAutomatique && sites.length > 0 && (
        <Option choisie={!choix} onClick={() => onChoisir(null)}>
          <div className="choix-carte">
            <span className={`rond-icone${!choix ? ' rond-icone--noir' : ''}`}>
              <Sparkles size={19} />
            </span>
            <div>
              <p className="demi-gras" style={{ fontSize: 15 }}>
                Le plus proche
              </p>
              <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                Choisi par Tôligo
              </p>
            </div>
          </div>
        </Option>
      )}

      {sites.length === 0 && (
        <VueVide
          icone={Warehouse}
          titre="Aucun entrepôt près de cette adresse"
          message="Tôligo ne passe pas encore près de votre adresse d'expédition."
        />
      )}

      {sites.map((site) => (
        <Option key={site.id} choisie={choix?.site?.id === site.id} onClick={() => onChoisir({ site })}>
          <div className="choix-carte">
            <span className={`rond-icone${choix?.site?.id === site.id ? ' rond-icone--noir' : ''}`}>
              <Warehouse size={19} />
            </span>
            <div className="extensible" style={{ minWidth: 0 }}>
              <p className="demi-gras une-ligne" style={{ fontSize: 15 }}>
                {site.nom}
              </p>
              {site.adresse && (
                <p className="texte-secondaire une-ligne" style={{ fontSize: 12.5, marginTop: 2 }}>
                  {site.adresse}
                </p>
              )}
            </div>
            {site.distanceKm != null && <span className="distance-site">{distance(site.distanceKm)}</span>}
          </div>
        </Option>
      ))}
    </Cascade>
  );
}
