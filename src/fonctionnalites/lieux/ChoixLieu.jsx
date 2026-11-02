import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { LocateFixed, Map as IconeCarte, MapPin, Search, X } from 'lucide-react';

import { Bouton, BoutonRond, Modale, Roue, useMessages } from '../../composants';
import { ABIDJAN, AjustementTaille, CarteOsm } from '../../commun/carte';
import { lieuDuPoint, positionActuelle, positionSiAutorisee, suggererLieux } from './api';
import './lieux.css';

/**
 * Fenêtre « Adresse » (maquette A-Envoi-Destinataire-Rechercher) : recherche
 * d'un lieu, position actuelle, ou choix d'un point sur la carte.
 *
 * Le lieu retenu est passé à `onChoisir({ nom, latitude, longitude, commune })`.
 */
export function ChoixLieu({ ouverte, onFermer, onChoisir, titre = 'Adresse' }) {
  const [mode, setMode] = useState('recherche');

  // Chaque ouverture repart de la recherche.
  useEffect(() => {
    if (ouverte) setMode('recherche');
  }, [ouverte]);

  const choisir = (lieu) => {
    onChoisir(lieu);
    onFermer();
  };

  return (
    <Modale ouverte={ouverte} onFermer={onFermer} titre={mode === 'carte' ? 'Choisir sur la carte' : titre} large haute>
      {mode === 'recherche' ? (
        <Recherche onChoisir={choisir} onCarte={() => setMode('carte')} />
      ) : (
        <ChoixSurCarte onChoisir={choisir} onRetour={() => setMode('recherche')} />
      )}
    </Modale>
  );
}

/** Recherche d'un lieu : on attend que l'utilisateur ait fini de taper avant d'appeler l'API. */
function Recherche({ onChoisir, onCarte }) {
  const { afficherErreur } = useMessages();
  const [texte, setTexte] = useState('');
  const [resultats, setResultats] = useState([]);
  const [recherche, setRecherche] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [localisation, setLocalisation] = useState(false);
  const [position, setPosition] = useState(null);
  const saisie = texte.trim();

  // Position déjà autorisée : les lieux proches de l'utilisateur passent en premier.
  useEffect(() => {
    let actif = true;
    positionSiAutorisee().then((point) => {
      if (actif) setPosition(point);
    });
    return () => {
      actif = false;
    };
  }, []);

  useEffect(() => {
    if (saisie.length < 2) {
      setResultats([]);
      setErreur(null);
      return undefined;
    }
    let actif = true;
    const attente = setTimeout(async () => {
      setRecherche(true);
      setErreur(null);
      try {
        const lieux = await suggererLieux(saisie, position);
        if (actif) setResultats(lieux);
      } catch (e) {
        if (actif) setErreur(e.messageAffichable ?? 'Recherche impossible.');
      } finally {
        if (actif) setRecherche(false);
      }
    }, 350);
    return () => {
      actif = false;
      clearTimeout(attente);
    };
  }, [saisie, position]);

  async function utiliserPosition() {
    setLocalisation(true);
    try {
      const position = await positionActuelle();
      onChoisir(await lieuDuPoint(position.latitude, position.longitude));
    } catch (e) {
      afficherErreur(e);
    } finally {
      setLocalisation(false);
    }
  }

  return (
    <div className="choix-lieu">
      <div className="champ-recherche-lieu">
        <Search size={20} aria-hidden="true" />
        <input
          type="search"
          placeholder="Rue, quartier, repère, commune…"
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          aria-label="Rechercher un lieu"
          autoComplete="off"
        />
        {texte && (
          <button type="button" className="champ-recherche-lieu__effacer" onClick={() => setTexte('')} aria-label="Effacer">
            <X size={16} />
          </button>
        )}
      </div>

      <button type="button" className="ligne-lieu ligne-lieu--action" onClick={utiliserPosition} disabled={localisation}>
        <span className="rond-icone">{localisation ? <Roue taille="petite" /> : <LocateFixed size={19} />}</span>
        <span className="demi-gras">Utiliser ma position actuelle</span>
      </button>

      {recherche && (
        <div style={{ padding: '8px 0' }}>
          <Roue taille="petite" />
        </div>
      )}
      {erreur && <p className="texte-secondaire" style={{ padding: 12 }}>{erreur}</p>}

      {resultats.length > 0 && (
        <p className="etiquette-section" style={{ margin: '16px 0 4px' }}>
          Résultats
        </p>
      )}
      {resultats.map((lieu, i) => (
        <button type="button" key={`${lieu.nom}-${i}`} className="ligne-lieu" onClick={() => onChoisir(lieu)}>
          <span className="rond-icone">
            <MapPin size={19} />
          </span>
          <span className="extensible">
            <TexteSurligne texte={lieu.nom} recherche={saisie} />
            <span className="ligne-lieu__ville">{ligneVille(lieu)}</span>
          </span>
        </button>
      ))}

      {!recherche && saisie.length >= 2 && resultats.length === 0 && !erreur && (
        <p className="texte-secondaire" style={{ padding: '16px 0', fontSize: 13.5, lineHeight: 1.45 }}>
          Aucun lieu trouvé. Essayez un quartier ou un repère connu, ou choisissez le point sur la carte.
        </p>
      )}

      <div className="choix-lieu__pied">
        <Bouton variante="secondaire" icone={IconeCarte} onClick={onCarte}>
          Choisir sur la carte
        </Bouton>
      </div>
    </div>
  );
}

/**
 * « Abidjan, Côte d'Ivoire », ou « Treichville, Abidjan » quand le nom du
 * lieu ne dit pas déjà sa commune.
 */
function ligneVille(lieu) {
  const commune = lieu.commune?.nom;
  if (!commune || lieu.nom.toLowerCase().includes(commune.toLowerCase())) return "Abidjan, Côte d'Ivoire";
  return `${commune}, Abidjan`;
}

/** Met en gras, dans le nom du lieu, chaque mot saisi (« Avenue 21 Trei »). */
function TexteSurligne({ texte, recherche }) {
  const mots = recherche
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (mots.length === 0) return <span className="ligne-lieu__nom">{texte}</span>;

  // Repère, caractère par caractère, ce qui correspond à un mot saisi.
  const bas = texte.toLowerCase();
  const gras = new Array(texte.length).fill(false);
  mots.forEach((mot) => {
    for (let debut = bas.indexOf(mot); debut >= 0; debut = bas.indexOf(mot, debut + mot.length)) {
      for (let i = debut; i < debut + mot.length; i += 1) gras[i] = true;
    }
  });

  const morceaux = [];
  let debut = 0;
  for (let i = 1; i <= texte.length; i += 1) {
    if (i === texte.length || gras[i] !== gras[debut]) {
      const morceau = texte.slice(debut, i);
      morceaux.push(gras[debut] ? <strong key={debut}>{morceau}</strong> : morceau);
      debut = i;
    }
  }
  return <span className="ligne-lieu__nom">{morceaux}</span>;
}

/** Suit le centre de la carte pendant que l'utilisateur la déplace. */
function SuiviCentre({ onCentre }) {
  useMapEvents({
    moveend: (evenement) => {
      const centre = evenement.target.getCenter();
      onCentre([centre.lat, centre.lng]);
    },
  });
  return null;
}

/** Bouton « Me localiser » posé sur la carte. */
function BoutonMeLocaliser() {
  const carte = useMap();
  const { afficherErreur } = useMessages();
  return (
    <div className="carte-choix__localiser">
      <BoutonRond
        icone={LocateFixed}
        libelle="Me localiser"
        apparence="flottant"
        taille={20}
        onClick={async () => {
          try {
            const position = await positionActuelle();
            carte.setView([position.latitude, position.longitude], 16);
          } catch (e) {
            afficherErreur(e);
          }
        }}
      />
    </div>
  );
}

/** L'utilisateur déplace la carte sous l'épingle centrale, puis valide. */
function ChoixSurCarte({ onChoisir, onRetour }) {
  const { afficherErreur } = useMessages();
  const centre = useRef(ABIDJAN);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    setEnCours(true);
    try {
      onChoisir(await lieuDuPoint(centre.current[0], centre.current[1]));
    } catch (e) {
      afficherErreur(e);
      setEnCours(false);
    }
  }

  return (
    <div className="carte-choix">
      <p className="texte-secondaire" style={{ fontSize: 13.5, marginBottom: 10 }}>
        Déplacez la carte pour placer l'épingle sur l'adresse exacte.
      </p>
      <div className="carte-choix__carte">
        <CarteOsm centre={ABIDJAN} zoom={13}>
          <AjustementTaille />
          <SuiviCentre onCentre={(point) => (centre.current = point)} />
          <BoutonMeLocaliser />
        </CarteOsm>
        <MapPin className="carte-choix__epingle" size={48} fill="var(--accent)" color="var(--blanc)" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <div className="choix-lieu__pied" style={{ display: 'grid', gap: 8 }}>
        <Bouton enCours={enCours} onClick={valider}>
          Valider ce point
        </Bouton>
        <Bouton variante="texte" onClick={onRetour}>
          Revenir à la recherche
        </Bouton>
      </div>
    </div>
  );
}
