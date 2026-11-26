import { useCallback, useEffect, useState } from 'react';
import { MapPin, Sparkles, Store } from 'lucide-react';

import { Bouton, Cascade, Chargement, Option, VueErreur, VueVide } from '../../composants';
import { distance } from '../../utils/formatage';
import { sitesDeDepot, stationsDeDepot } from './api';

/**
 * Choix du lieu de dépôt (§9.1) : la station qui arrange l'expéditeur, puis le
 * site (entrepôt) où il apportera ses colis.
 *
 * Deux temps dans le même composant : la liste des stations qui desservent
 * l'adresse d'expédition, puis celle des sites de la station retenue. Les deux
 * vont du plus proche au plus lointain, distances calculées par le serveur.
 *
 * `onChoisir({ station, site })` est appelé dès qu'un site est retenu, et
 * `onChoisir(null)` quand l'expéditeur préfère laisser Tôligo décider : le
 * serveur retient alors l'entrepôt le plus proche à la confirmation.
 *
 * Tous les sites sont sélectionnables (26/11/2026) : le nombre de box libres
 * n'est qu'une information, un colis sans box libre attend à l'entrepôt.
 */
export function ChoixDepot({ position, choix, onChoisir, avecAutomatique = true }) {
  const [stations, setStations] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [station, setStation] = useState(choix?.station ?? null);
  const [sites, setSites] = useState(null);
  const [erreurSites, setErreurSites] = useState(null);

  const chargerStations = useCallback(async () => {
    setErreur(null);
    setStations(null);
    try {
      setStations(await stationsDeDepot(position));
    } catch (e) {
      setErreur(e);
    }
  }, [position.latitude, position.longitude]);

  const chargerSites = useCallback(
    async (laStation) => {
      setErreurSites(null);
      setSites(null);
      try {
        setSites(await sitesDeDepot(laStation.id, position));
      } catch (e) {
        setErreurSites(e);
      }
    },
    [position.latitude, position.longitude],
  );

  useEffect(() => {
    chargerStations();
  }, [chargerStations]);

  useEffect(() => {
    if (station) chargerSites(station);
  }, [station, chargerSites]);

  // --- Les sites de la station retenue ---
  if (station) {
    return (
      <>
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 14.5 }}>
            <span className="texte-secondaire">Sites de dépôt de </span>
            <span className="demi-gras">{station.nom}</span>
          </p>
          <Bouton
            variante="texte"
            compact
            onClick={() => {
              setStation(null);
              setSites(null);
              onChoisir(null);
            }}
          >
            Changer de station
          </Bouton>
        </div>

        {erreurSites && <VueErreur erreur={erreurSites} onReessayer={() => chargerSites(station)} />}
        {!erreurSites && sites === null && <Chargement message="Recherche des sites de dépôt…" />}

        {sites !== null && sites.length === 0 && (
          <VueVide
            icone={MapPin}
            titre="Aucun site de dépôt"
            message="Cette station n'a pas encore de site où déposer un colis. Choisissez une autre station."
          />
        )}

        {sites !== null && sites.length > 0 && (
          <Cascade style={{ marginTop: 12 }}>
            {sites.map((site) => {
              return (
                <Option key={site.id} choisie={choix?.site?.id === site.id} onClick={() => onChoisir({ station, site })}>
                  <div>
                    <p className="demi-gras" style={{ fontSize: 15 }}>
                      {site.nom}
                    </p>
                    {site.adresse && (
                      <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {site.adresse}
                      </p>
                    )}
                    <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {[
                        site.distanceKm != null ? distance(site.distanceKm) : null,
                        `${site.nbBoxLibres} box libre${site.nbBoxLibres > 1 ? 's' : ''}`,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </Option>
              );
            })}
          </Cascade>
        )}
      </>
    );
  }

  // --- Les stations qui desservent l'adresse ---
  if (erreur) return <VueErreur erreur={erreur} onReessayer={chargerStations} />;
  if (stations === null) return <Chargement message="Recherche des stations…" />;

  return (
    <Cascade style={{ marginTop: 12 }}>
      {avecAutomatique && (
        <Option choisie={!choix} onClick={() => onChoisir(null)}>
          <div className="choix-carte">
            <span className={`rond-icone${!choix ? ' rond-icone--noir' : ''}`}>
              <Sparkles size={19} />
            </span>
            <div>
              <p className="demi-gras" style={{ fontSize: 15 }}>
                Laisser Tôligo choisir
              </p>
              <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.35 }}>
                L’entrepôt le plus proche de votre adresse, dans la station la plus proche.
              </p>
            </div>
          </div>
        </Option>
      )}

      {stations.length === 0 && (
        <VueVide
          icone={Store}
          titre="Aucune station ne dessert cette adresse"
          message="Tôligo ne passe pas encore près de votre adresse d'expédition."
        />
      )}

      {stations.map((uneStation) => (
        <Option
          key={uneStation.id}
          choisie={false}
          indicateur={false}
          desactivee={uneStation.nbSites === 0}
          onClick={() => setStation(uneStation)}
        >
          <div>
            <p className="demi-gras" style={{ fontSize: 15 }}>
              {uneStation.nom}
            </p>
            {uneStation.adresse && (
              <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                {uneStation.adresse}
              </p>
            )}
            <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
              {[
                uneStation.distanceKm != null ? distance(uneStation.distanceKm) : null,
                uneStation.nbSites === 0
                  ? 'aucun site de dépôt'
                  : `${uneStation.nbSites} site${uneStation.nbSites > 1 ? 's' : ''} de dépôt`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </Option>
      ))}
    </Cascade>
  );
}
