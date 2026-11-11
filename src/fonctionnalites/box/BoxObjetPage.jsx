import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Camera, ChevronRight, FileText, Luggage, Package } from 'lucide-react';

import { ApiErreur } from '../../api/client';
import { Bouton, Carte, Champ, EnTete, Page, Pastille, PiedDAction, Roue, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { useDonnees } from '../../utils/useDonnees';
import { estimerDimensions, libelleDuree, nomCourt, rechercherBox, tousLesEntrepots, typesObjets } from './api';
import './box.css';

/** Date pour un champ <input type="datetime-local"> : « 2026-10-08T10:00 » (heure locale). */
function versSaisie(date) {
  const deux = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${deux(date.getMonth() + 1)}-${deux(date.getDate())}T${deux(date.getHours())}:${deux(date.getMinutes())}`;
}

/** « 55 », « 55,5 » -> 55.5 ; 0 si la saisie n'est pas un nombre. */
function nombreSaisi(texte) {
  return Number(String(texte).replace(',', '.')) || 0;
}

/** Icône d'une catégorie d'après son libellé ; les autres n'en ont pas, comme dans la maquette. */
function iconeCategorie(libelle) {
  const nom = libelle.toLowerCase();
  if (nom.includes('valise') || nom.includes('bagage')) return Luggage;
  if (nom.includes('carton')) return Package;
  if (nom.includes('document')) return FileText;
  return null;
}

/**
 * Maquette A-Box-Objet (étape 1 sur 2) : objet à stocker et période.
 *
 * L'entrepôt arrive de l'écran précédent ; si la page est ouverte
 * directement (lien, rechargement), il est relu dans la liste des entrepôts.
 */
export default function BoxObjetPage() {
  const { id } = useParams();
  const { state } = useLocation();
  const entrepot = useDonnees(async () => {
    const trouve = state?.entrepot ?? (await tousLesEntrepots()).find((e) => e.id === id);
    if (!trouve) throw new ApiErreur('Entrepôt introuvable.', { statut: 404 });
    return trouve;
  }, [id]);

  if (entrepot.donnees === undefined) {
    return (
      <Page titre="Louer un box" entete={<EnTete titre="Que stockez-vous ?" repli={Routes.entrepots} />}>
        <VueDonnees etat={entrepot}>{() => null}</VueDonnees>
      </Page>
    );
  }
  return <FormulaireObjet entrepot={entrepot.donnees} />;
}

function FormulaireObjet({ entrepot }) {
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const types = useDonnees(typesObjets, []);

  // Par défaut : dans une heure, pour 24 h.
  const [debut, setDebut] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [fin, setFin] = useState(() => new Date(debut.getTime() + 24 * 3600000));
  const [type, setType] = useState(null);
  const [nom, setNom] = useState('');
  const [dimensions, setDimensions] = useState({ longueur: '', largeur: '', hauteur: '', poids: '' });
  const [estimation, setEstimation] = useState(false);
  const [dimensionsManquantes, setDimensionsManquantes] = useState(false);
  const [erreurNom, setErreurNom] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const heures = Math.round((fin - debut) / 3600000);

  async function estimer(fichiers) {
    const photos = Array.from(fichiers).slice(0, 3);
    if (photos.length === 0) return;
    setEstimation(true);
    try {
      const estimees = await estimerDimensions(photos);
      setDimensions((d) => ({
        ...d,
        longueur: String(Math.round(estimees.longueur)),
        largeur: String(Math.round(estimees.largeur)),
        hauteur: String(Math.round(estimees.hauteur)),
      }));
      afficherMessage('Dimensions estimées : vérifiez-les avant de continuer.');
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setEstimation(false);
    }
  }

  function changerDebut(texte) {
    const nouveau = new Date(texte);
    if (Number.isNaN(nouveau.getTime())) return;
    setDebut(nouveau);
    if (fin <= nouveau) setFin(new Date(nouveau.getTime() + 24 * 3600000));
  }

  async function rechercher() {
    if (!type) {
      afficherMessage("Choisissez la catégorie de l'objet.");
      return;
    }
    const valides = ['longueur', 'largeur', 'hauteur'].every((cle) => nombreSaisi(dimensions[cle]) > 0);
    setDimensionsManquantes(!valides);
    setErreurNom(nom.trim() ? null : "Décrivez l'objet.");
    if (!valides) {
      afficherMessage("Indiquez la longueur, la largeur et la hauteur de l'objet.");
      return;
    }
    if (!nom.trim()) return;
    if (heures < 1) {
      afficherMessage('La location doit durer au moins une heure.');
      return;
    }

    const recherche = {
      entrepot,
      typeObjet: type,
      libelleObjet: nom.trim(),
      longueur: nombreSaisi(dimensions.longueur),
      largeur: nombreSaisi(dimensions.largeur),
      hauteur: nombreSaisi(dimensions.hauteur),
      poids: nombreSaisi(dimensions.poids) || null,
      debut: debut.toISOString(),
      fin: fin.toISOString(),
    };

    setEnCours(true);
    try {
      const boxes = await rechercherBox(recherche);
      naviguer(Routes.boxChoix, { state: { recherche, boxes } });
    } catch (erreur) {
      afficherErreur(erreur);
      setEnCours(false);
    }
  }

  const CASES = [
    ['longueur', 'Long. cm'],
    ['largeur', 'Larg. cm'],
    ['hauteur', 'Haut. cm'],
    ['poids', 'Poids kg'],
  ];

  return (
    <Page
      titre="Que stockez-vous ?"
      entete={<EnTete titre="Que stockez-vous ?" sousTitre={`${nomCourt(entrepot.nom)} · étape 1 sur 2`} repli={Routes.entrepots} />}
      pied={
        <PiedDAction>
          <Bouton enCours={enCours} onClick={rechercher}>
            Voir les box disponibles
          </Bouton>
        </PiedDAction>
      }
    >
      <div className="pile" style={{ gap: 15 }}>
        <div>
          <p className="champ__libelle" style={{ marginBottom: 8 }}>
            Catégorie
          </p>
          {types.erreur ? (
            <p className="texte-secondaire">Catégories indisponibles</p>
          ) : !types.donnees ? (
            <Roue taille="petite" />
          ) : (
            <div className="defilement-horizontal">
              {types.donnees.map((t) => {
                const Icone = iconeCategorie(t.libelle);
                return (
                  <button
                    key={t.id}
                    type="button"
                    className={`puce-categorie${type?.id === t.id ? ' puce-categorie--choisie' : ''}`}
                    aria-pressed={type?.id === t.id}
                    onClick={() => setType(t)}
                  >
                    {Icone && <Icone size={16} />}
                    {t.libelle}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Champ
          libelle="Nom de l'objet"
          bordee
          placeholder="Valise cabine bleue"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          erreur={erreurNom}
        />

        <label className="estimation-photo">
          <span className="estimation-photo__icone">{estimation ? <Roue taille="petite" /> : <Camera size={20} />}</span>
          <span className="extensible">
            <span className="demi-gras" style={{ display: 'block', fontSize: 14.5 }}>
              {estimation ? 'Estimation en cours…' : 'Estimer avec une photo'}
            </span>
            <span style={{ display: 'block', fontSize: 12.5, color: 'var(--info)', marginTop: 1 }}>
              1 à 3 photos, les dimensions sont remplies pour vous
            </span>
          </span>
          <ChevronRight size={20} />
          <input
            type="file"
            accept="image/*"
            multiple
            className="invisible"
            disabled={estimation}
            onChange={(e) => {
              estimer(e.target.files);
              e.target.value = '';
            }}
          />
        </label>

        <div>
          <p className="champ__libelle" style={{ marginBottom: 7 }}>
            Dimensions et poids
          </p>
          <div className="dimensions">
            {CASES.map(([cle, libelle], i) => {
              const enErreur = dimensionsManquantes && i < 3 && nombreSaisi(dimensions[cle]) <= 0;
              return (
                <label
                  key={cle}
                  className={`case-dimension${i === 3 ? ' case-dimension--facultative' : ''}${enErreur ? ' case-dimension--erreur' : ''}`}
                >
                  <span>{libelle}</span>
                  <input
                    inputMode="decimal"
                    placeholder={i === 3 ? '—' : ''}
                    value={dimensions[cle]}
                    onChange={(e) => setDimensions((d) => ({ ...d, [cle]: e.target.value.replace(/[^\d.,]/g, '') }))}
                  />
                </label>
              );
            })}
          </div>
        </div>

        {/* Période de location : début et fin, durée en pastille. */}
        <Carte sansMarge>
          <div className="periode__ligne">
            <label htmlFor="debut-location">Début</label>
            <input id="debut-location" type="datetime-local" value={versSaisie(debut)} onChange={(e) => changerDebut(e.target.value)} />
          </div>
          <hr className="separateur" style={{ marginLeft: 66 }} />
          <div className="periode__ligne">
            <label htmlFor="fin-location">Fin</label>
            <input
              id="fin-location"
              type="datetime-local"
              value={versSaisie(fin)}
              min={versSaisie(debut)}
              onChange={(e) => {
                const nouvelle = new Date(e.target.value);
                if (!Number.isNaN(nouvelle.getTime())) setFin(nouvelle);
              }}
            />
            <Pastille>{heures > 0 ? libelleDuree(heures) : '—'}</Pastille>
          </div>
        </Carte>
      </div>
    </Page>
  );
}
