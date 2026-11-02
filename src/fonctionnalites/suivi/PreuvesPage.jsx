import { useParams } from 'react-router-dom';
import { BadgeCheck, Bike, Scale, Truck } from 'lucide-react';

import { Cascade, EnTete, IconeBox, IconeDrone, Page, VueDonnees, VueVide } from '../../composants';
import { Routes } from '../../commun/routes';
import { estAujourdhui, heure, moment } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { ImageProtegee } from './ImageProtegee';
import { listerPreuves } from './api';
import './suivi.css';

/** Icône et couleurs d'une preuve, selon son type (parcours V3.3). */
function iconePreuve(preuve) {
  switch (preuve.type) {
    case 'depot_box':
      return [<IconeBox size={21} key="i" />, 'var(--surface-alt)', 'var(--encre)'];
    case 'ramassage':
      return [<Truck size={21} key="i" />, 'var(--surface-alt)', 'var(--encre)'];
    case 'controle_station':
      return [<Scale size={21} key="i" />, 'var(--surface-alt)', 'var(--encre)'];
    case 'depart_station':
      return preuve.libelle.includes('drone')
        ? [<IconeDrone taille={21} key="i" />, 'var(--accent-clair)', 'var(--accent-fonce)']
        : [<Truck size={21} key="i" />, 'var(--accent-clair)', 'var(--accent-fonce)'];
    case 'remise':
      return [<BadgeCheck size={21} key="i" />, 'var(--succes-clair)', 'var(--succes-fonce)'];
    default:
      return [<Bike size={21} key="i" />, 'var(--surface-alt)', 'var(--encre)'];
  }
}

/** « Aujourd'hui, 13:21 » pour une photo, l'heure seule sinon. */
function quand(preuve) {
  if (!preuve.survenuLe) return '';
  if (!preuve.photoUrl) return heure(preuve.survenuLe);
  return estAujourdhui(preuve.survenuLe) ? `Aujourd'hui, ${heure(preuve.survenuLe)}` : moment(preuve.survenuLe);
}

/** Maquette A-Preuves : chaque remise du colis, avec qui, où et quand. */
export default function PreuvesPage() {
  const { code } = useParams();
  const preuves = useDonnees(() => listerPreuves(code), [code]);

  return (
    <Page titre={`Preuves ${code}`} fond="var(--surface)" entete={<EnTete titre="Preuves" repli={Routes.colis(code)} />}>
      <h2 style={{ fontSize: 20 }}>Colis {code}</h2>
      <p className="texte-secondaire" style={{ fontSize: 13.5, marginTop: 3 }}>
        Chaque remise du colis est enregistrée : qui, où, quand.
      </p>

      <div style={{ marginTop: 16 }}>
        <VueDonnees etat={preuves}>
          {(liste) =>
            liste.length === 0 ? (
              <VueVide titre="Aucune preuve pour le moment" icone={BadgeCheck} />
            ) : (
              <Cascade className="grille-preuves">
                {liste.map((preuve, i) => (preuve.disponible ? <CartePreuve key={i} preuve={preuve} /> : <PreuveAVenir key={i} preuve={preuve} />))}
              </Cascade>
            )
          }
        </VueDonnees>
      </div>
    </Page>
  );
}

/** Preuve enregistrée : photo (remise) ou ligne avec icône. */
function CartePreuve({ preuve }) {
  const textes = (
    <div className="extensible">
      <div className="rangee" style={{ gap: 10, alignItems: 'flex-start' }}>
        <p className="extensible demi-gras" style={{ fontSize: 15 }}>
          {preuve.libelle}
        </p>
        {preuve.survenuLe && (
          <span className="texte-secondaire" style={{ fontSize: 13 }}>
            {quand(preuve)}
          </span>
        )}
      </div>
      {preuve.detail && (
        <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
          {preuve.detail}
        </p>
      )}
      {preuve.resultat && <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--succes)', marginTop: 2 }}>{preuve.resultat}</p>}
    </div>
  );

  if (preuve.photoUrl) {
    return (
      <div className="carte-preuve">
        <ImageProtegee url={preuve.photoUrl} hauteur={180} />
        <div style={{ marginTop: 12 }}>{textes}</div>
      </div>
    );
  }

  const [icone, fond, couleur] = iconePreuve(preuve);
  return (
    <div className="carte-preuve rangee" style={{ gap: 12 }}>
      <span className="vignette" style={{ width: 44, height: 44, background: fond, color: couleur }}>
        {icone}
      </span>
      {textes}
    </div>
  );
}

/** Preuve pas encore disponible : cadre en pointillés. */
function PreuveAVenir({ preuve }) {
  return (
    <div className="preuve-a-venir">
      <span className="vignette" style={{ width: 44, height: 44, background: 'var(--blanc)', color: 'var(--texte-desactive)' }}>
        <BadgeCheck size={21} />
      </span>
      <div>
        <p className="demi-gras" style={{ fontSize: 15, color: 'var(--info)' }}>
          {preuve.libelle}
        </p>
        {preuve.detail && (
          <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
            {preuve.detail}
          </p>
        )}
      </div>
    </div>
  );
}
