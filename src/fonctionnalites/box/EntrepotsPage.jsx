import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { LocateFixed, Search, Warehouse, X } from 'lucide-react';

import { BoutonRond, Cascade, EnTete, Filtre, Option, Page, Pastille, useMessages, VueDonnees, VueVide } from '../../composants';
import { ABIDJAN, AjustementTaille, Cadrage, CarteOsm, distanceKm, iconeClient, iconeEntrepot } from '../../commun/carte';
import { Routes } from '../../commun/routes';
import { distance, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { adresseParDefaut, listerAdresses } from '../adresses/api';
import { positionActuelle } from '../lieux/api';
import { tousLesEntrepots } from './api';
import './box.css';

/** Minuscules sans accents, pour que « angre » trouve « Angré ». */
function simplifier(texte) {
  return texte
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** « Cocody · 1,2 km · dès 200 F/h » */
function resumeEntrepot(entrepot) {
  return [
    entrepot.commune,
    entrepot.distanceKm !== null ? distance(entrepot.distanceKm) : null,
    entrepot.prixMinHeure !== null ? `dès ${prix(entrepot.prixMinHeure)}/h` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Maquette A-Box-Entrepots : carte et liste des entrepôts, du plus proche au
 * plus loin, filtrables par commune ou par une recherche.
 *
 * Les distances partent de l'adresse par défaut du client, ou de sa position
 * s'il appuie sur « Me localiser » : on ne demande pas la position d'office.
 * La liste complète est chargée une fois ; filtres et recherche se font dans
 * le navigateur, sans nouvel appel au serveur.
 */
export default function EntrepotsPage() {
  const naviguer = useNavigate();
  const { afficherErreur } = useMessages();
  const entrepots = useDonnees(tousLesEntrepots, []);
  const adresses = useDonnees(listerAdresses, []);

  const [recherche, setRecherche] = useState('');
  const [position, setPosition] = useState(null);
  // Commune choisie dans les filtres ; null pour « À proximité ».
  const [commune, setCommune] = useState(null);
  // Entrepôt mis en avant (repère noir sur la carte) ; null : le premier.
  const [choisi, setChoisi] = useState(null);

  const adresse = adresseParDefaut(adresses.donnees ?? []);
  const reference = position ?? (adresse ? [adresse.latitude, adresse.longitude] : null);

  async function meLocaliser() {
    try {
      const p = await positionActuelle();
      setPosition([p.latitude, p.longitude]);
      setCommune(null);
      setChoisi(null);
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  /** Entrepôts affichés : filtrés, avec leur distance, du plus proche au plus loin. */
  const liste = useMemo(() => {
    const texte = simplifier(recherche.trim());
    const filtres = (entrepots.donnees ?? [])
      .filter((e) => !commune || e.commune === commune)
      .filter((e) => texte.length < 2 || simplifier(`${e.nom} ${e.localite ?? ''} ${e.commune ?? ''}`).includes(texte))
      .map((e) =>
        reference && e.latitude !== null && e.longitude !== null ? { ...e, distanceKm: distanceKm(reference, [e.latitude, e.longitude]) } : e,
      );
    if (reference) filtres.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return filtres;
  }, [entrepots.donnees, recherche, commune, reference?.[0], reference?.[1]]); // eslint-disable-line react-hooks/exhaustive-deps

  const communes = [...new Set((entrepots.donnees ?? []).map((e) => e.commune).filter(Boolean))].sort();
  const enAvant = liste.find((e) => e.id === choisi) ?? liste[0];
  const ouvrir = (entrepot) => naviguer(Routes.boxObjet(entrepot.id), { state: { entrepot } });

  return (
    <Page titre="Louer un box" largeur="large" entete={<EnTete titre="Louer un box" />}>
      <VueDonnees etat={entrepots}>
        {() => (
          // Téléphone : recherche, carte, filtres puis liste. Ordinateur : la carte à droite.
          <div className="entrepots__mise-en-page">
              <label className="recherche-entrepot entrepots__recherche">
                <Search size={20} aria-hidden="true" />
                <span className="invisible">Rechercher un entrepôt</span>
                <input
                  type="search"
                  placeholder="Commune, quartier ou entrepôt"
                  value={recherche}
                  onChange={(e) => setRecherche(e.target.value)}
                />
                {recherche && (
                  <button type="button" className="champ__oeil" style={{ width: 36, height: 36 }} onClick={() => setRecherche('')} aria-label="Effacer">
                    <X size={18} />
                  </button>
                )}
              </label>

              <div className="defilement-horizontal entrepots__filtres">
                {/* Sans point de départ connu, « À proximité » demande la position. */}
                <Filtre actif={commune === null} onClick={reference ? () => setCommune(null) : meLocaliser}>
                  À proximité
                </Filtre>
                {communes.map((c) => (
                  <Filtre key={c} actif={commune === c} onClick={() => setCommune(c)}>
                    {c}
                  </Filtre>
                ))}
              </div>

              {liste.length === 0 ? (
                <div className="entrepots__liste">
                  <VueVide titre="Aucun entrepôt trouvé" icone={Warehouse} />
                </div>
              ) : (
                <Cascade className="pile entrepots__liste" style={{ gap: 8 }}>
                  {liste.map((entrepot) => (
                    <Option key={entrepot.id} choisie={entrepot.id === enAvant?.id} indicateur={false} onClick={() => ouvrir(entrepot)}>
                      <div className="rangee" style={{ gap: 12 }}>
                        <div className="extensible">
                          <p style={{ fontSize: 15, fontWeight: 700 }}>{entrepot.nom}</p>
                          <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 3 }}>
                            {resumeEntrepot(entrepot) || entrepot.localite}
                          </p>
                        </div>
                        {entrepot.nbBoxLibres !== null &&
                          (entrepot.nbBoxLibres > 0 ? (
                            <Pastille ton="succes">
                              {entrepot.nbBoxLibres} libre{entrepot.nbBoxLibres > 1 ? 's' : ''}
                            </Pastille>
                          ) : (
                            <Pastille>Complet</Pastille>
                          ))}
                      </div>
                    </Option>
                  ))}
                </Cascade>
              )}

            <div className="entrepots__carte">
              <div className="carte-entrepots">
                <CarteOsm centre={reference ?? ABIDJAN} zoom={12}>
                  <AjustementTaille />
                  <Cadrage
                    points={[
                      ...(reference ? [reference] : []),
                      ...liste.filter((e) => e.latitude !== null && e.longitude !== null).map((e) => [e.latitude, e.longitude]),
                    ]}
                    marge={40}
                  />
                  {reference && <Marker position={reference} icon={iconeClient()} />}
                  {liste
                    .filter((e) => e.latitude !== null && e.longitude !== null)
                    .map((e) => (
                      <Marker
                        key={e.id}
                        position={[e.latitude, e.longitude]}
                        icon={iconeEntrepot(e.nbBoxLibres ?? 0, e.id === enAvant?.id)}
                        zIndexOffset={e.id === enAvant?.id ? 1000 : 0}
                        eventHandlers={{ click: () => setChoisi(e.id) }}
                      />
                    ))}
                </CarteOsm>
                <div className="carte-entrepots__localiser">
                  <BoutonRond icone={LocateFixed} libelle="Me localiser" apparence="flottant" taille={20} onClick={meLocaliser} />
                </div>
              </div>
            </div>
          </div>
        )}
      </VueDonnees>
    </Page>
  );
}
