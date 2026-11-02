import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Bike, Info, User, Users } from 'lucide-react';

import { Bouton, Carte, Champ, EncadreInfo, EnTete, Interrupteur, Modale, Page, Pastille, PiedDAction, useMessages, useRetour } from '../../composants';
import { Routes } from '../../commun/routes';
import { heure } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { creerCodeTemporaire, detailLocation } from './api';
import './box.css';

const POUR_QUI = [
  ['Livreur Tôligo', Bike],
  ['Un proche', Users],
  ['Autre', User],
];

/** Durée de validité d'un code temporaire, fixée par le serveur. */
const DUREE_HEURES = 6;

/** « 14:30 » pour un champ <input type="time">. */
function versSaisieHeure(date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

/**
 * Maquette A-Box-CodeTemp : code distinct, valable 6 h, pour qu'une autre
 * personne dépose ou récupère un objet.
 *
 * « Pour qui ? » n'a pas de champ dans l'API : il est ajouté au nom du code.
 */
export default function CodeTemporairePage() {
  const { id } = useParams();
  const retour = useRetour(Routes.boxDetail(id));
  const { afficherMessage, afficherErreur } = useMessages();
  const location = useDonnees(() => detailLocation(id), [id]);

  const [pourQui, setPourQui] = useState(POUR_QUI[0][0]);
  const [nom, setNom] = useState("Dépôt d'un colis");
  const [usageUnique, setUsageUnique] = useState(true);
  const [debut, setDebut] = useState(() => new Date());
  const [enCours, setEnCours] = useState(false);
  const [codeCree, setCodeCree] = useState(null);

  const fin = new Date(debut.getTime() + DUREE_HEURES * 3600000);

  function changerHeure(texte) {
    const [heures, minutes] = texte.split(':').map(Number);
    if (Number.isNaN(heures) || Number.isNaN(minutes)) return;
    const nouveau = new Date();
    nouveau.setHours(heures, minutes, 0, 0);
    setDebut(nouveau);
  }

  async function creer() {
    setEnCours(true);
    try {
      setCodeCree(await creerCodeTemporaire({ locationId: id, libelle: `${pourQui} · ${nom.trim()}`, usageUnique, debut }));
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  async function copierEtFermer() {
    try {
      await navigator.clipboard.writeText(codeCree.code);
      afficherMessage('Code copié : transmettez-le à la personne concernée.');
    } catch {
      // Le code reste affiché dans le détail du box.
    }
    setCodeCree(null);
    retour();
  }

  return (
    <Page
      titre="Code temporaire"
      entete={<EnTete titre="Code temporaire" repli={Routes.boxDetail(id)} />}
      pied={
        <PiedDAction>
          <Bouton enCours={enCours} onClick={creer}>
            Créer et partager le code
          </Bouton>
        </PiedDAction>
      }
    >
      <h1 style={{ fontSize: 22 }}>Donner accès à {location.donnees?.boxLibelle ?? 'votre box'}</h1>
      <p className="texte-secondaire" style={{ fontSize: 14.5, lineHeight: 1.5, marginTop: 6 }}>
        Un code distinct du vôtre, pour qu'une autre personne dépose ou récupère un objet.
      </p>

      <p className="champ__libelle" style={{ margin: '18px 0 8px' }}>
        Pour qui ?
      </p>
      <div className="grille" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
        {POUR_QUI.map(([libelle, Icone]) => (
          <button
            key={libelle}
            type="button"
            className={`choix-pour-qui${pourQui === libelle ? ' choix-pour-qui--choisi' : ''}`}
            aria-pressed={pourQui === libelle}
            onClick={() => setPourQui(libelle)}
          >
            <Icone size={22} />
            {libelle}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 18 }}>
        <Champ libelle="Nom du code" bordee placeholder="Dépôt colis TLG-24133" value={nom} onChange={(e) => setNom(e.target.value)} />
      </div>

      <Carte sansMarge style={{ marginTop: 18 }}>
        <div className="rangee" style={{ gap: 12, minHeight: 60, padding: '0 14px' }}>
          <div className="extensible">
            <p className="demi-gras" style={{ fontSize: 15 }}>
              Usage unique
            </p>
            <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
              Le code ne fonctionne qu'une fois
            </p>
          </div>
          <Interrupteur actif={usageUnique} onChange={setUsageUnique} libelle="Usage unique" />
        </div>
        <hr className="separateur" />
        <div className="periode__ligne">
          <label htmlFor="debut-code" style={{ width: 52 }}>
            Début
          </label>
          <span style={{ fontSize: 15, fontWeight: 600 }}>Aujourd'hui ·</span>
          <input id="debut-code" type="time" value={versSaisieHeure(debut)} onChange={(e) => changerHeure(e.target.value)} />
        </div>
        <hr className="separateur" />
        <div className="periode__ligne">
          <span style={{ width: 52, fontSize: 13, color: 'var(--texte-secondaire)' }}>Fin</span>
          <span className="extensible" style={{ fontSize: 15, fontWeight: 600, color: 'var(--info)' }}>
            {/* Après minuit, la fin tombe le lendemain. */}
            {fin.getDate() === debut.getDate() ? "Aujourd'hui" : 'Demain'} · {heure(fin)}
          </span>
          <Pastille>{DUREE_HEURES} h</Pastille>
        </div>
      </Carte>

      <div style={{ marginTop: 18 }}>
        <EncadreInfo icone={Info}>
          Un code temporaire est valable 6 h, pendant votre période de location. Vous pouvez le révoquer à tout moment.
        </EncadreInfo>
      </div>

      <Modale
        ouverte={codeCree !== null}
        onFermer={copierEtFermer}
        titre="Code créé"
        sansCroix
        pied={<Bouton onClick={copierEtFermer}>Copier et fermer</Bouton>}
      >
        <p className="code-cree">{codeCree?.code}</p>
        <p className="modale__texte" style={{ textAlign: 'center', marginTop: 8 }}>
          Valable jusqu'à {heure(codeCree?.fin)}. Transmettez-le à la personne concernée.
        </p>
      </Modale>
    </Page>
  );
}
