import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Check, MapPin, Search, Smartphone, Trash2 } from 'lucide-react';

import { AvatarInitiales, Bouton, Champ, ChampTelephone, EnTete, Page, PiedDAction, teinteDuRang, useRetour } from '../../composants';
import { Routes } from '../../commun/routes';
import { initiales } from '../../utils/formatage';
import { afficher as afficherTelephone, normaliser, valider as validerTelephone } from '../../utils/telephone';
import { useDonnees } from '../../utils/useDonnees';
import { ChoixLieu } from '../lieux/ChoixLieu';
import { descriptionLieu } from '../lieux/api';
import { destinatairesRecents } from './api';
import { useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquettes A-Envoi-Destinataire-Ajout et A-Envoi-Destinataire (modifier).
 *
 * L'adresse est un lieu recherché puis validé (il remplace commune,
 * quartier et adresse précise). Les « Récents » sont calculés à partir des
 * envois passés (D18).
 */
export default function DestinatairePage() {
  const { index } = useParams();
  const { brouillon } = useEnvoi();

  // Destinataire à modifier, ou null pour en ajouter un.
  const position = index === undefined ? null : Number(index);
  const existant = position === null ? null : brouillon.destinataires[position];
  if (position !== null && !existant) return <Navigate to={Routes.envoi} replace />;
  // Un seul destinataire par commande (V3.3) : on modifie celui qui existe.
  if (position === null && brouillon.destinataires.length > 0) return <Navigate to={Routes.modifierDestinataire(0)} replace />;

  return <FormulaireDestinataire position={position} existant={existant} />;
}

function FormulaireDestinataire({ position, existant }) {
  const retour = useRetour(Routes.envoi);
  const { ajouterDestinataire, modifierDestinataire, retirerDestinataire } = useEnvoi();
  const recents = useDonnees(destinatairesRecents, []);
  const modification = existant !== null;

  const [nom, setNom] = useState(existant?.nom ?? '');
  const [telephone, setTelephone] = useState(existant ? afficherTelephone(existant.telephone) : '');
  const [lieu, setLieu] = useState(existant?.lieu ?? null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  const [erreurs, setErreurs] = useState({});

  function appliquerRecent(recent) {
    setNom(recent.nom);
    setTelephone(afficherTelephone(recent.telephone));
    setLieu(recent.lieu);
    setErreurs({});
  }

  function enregistrer() {
    const nouvellesErreurs = {
      nom: nom.trim().length < 2 ? 'Saisissez le nom du destinataire.' : null,
      telephone: validerTelephone(telephone),
      lieu: lieu ? null : "Choisissez l'adresse du destinataire.",
    };
    setErreurs(nouvellesErreurs);
    if (Object.values(nouvellesErreurs).some(Boolean)) return;

    const donnees = { nom: nom.trim(), telephone: normaliser(telephone), lieu };
    if (!modification) {
      ajouterDestinataire({ ...donnees, adresse: descriptionLieu(lieu) });
    } else {
      // Un nouveau lieu remplace l'adresse ; sinon on garde l'adresse saisie.
      const memeLieu = lieu.latitude === existant.lieu.latitude && lieu.longitude === existant.lieu.longitude;
      modifierDestinataire(position, { ...donnees, adresse: memeLieu ? existant.adresse : descriptionLieu(lieu) });
    }
    retour();
  }

  function retirer() {
    retirerDestinataire(position);
    retour();
  }

  return (
    <Page
      titre={modification ? 'Modifier le destinataire' : 'Ajouter un destinataire'}
      entete={
        <EnTete
          titre={modification ? 'Modifier le destinataire' : 'Ajouter un destinataire'}
          fermer={!modification}
          gris
          repli={Routes.envoi}
        />
      }
      pied={
        <PiedDAction arrondi>
          <Bouton onClick={enregistrer}>{modification ? 'Enregistrer' : 'Ajouter ce destinataire'}</Bouton>
          {modification && (
            <Bouton variante="danger" icone={Trash2} onClick={retirer}>
              Retirer ce destinataire
            </Bouton>
          )}
        </PiedDAction>
      }
    >
      <form
        className="pile"
        style={{ gap: 12 }}
        noValidate
        onSubmit={(evenement) => {
          evenement.preventDefault();
          enregistrer();
        }}
      >
        {modification ? (
          <BandeauDestinataire destinataire={existant} rang={position} />
        ) : (
          recents.donnees?.length > 0 && <Recents liste={recents.donnees} choisi={nom} onChoisir={appliquerRecent} />
        )}

        <Champ
          libelle="Nom complet"
          placeholder="Mariam Traoré"
          autoCapitalize="words"
          value={nom}
          onChange={(e) => {
            setNom(e.target.value);
            setErreurs((ancien) => ({ ...ancien, nom: null }));
          }}
          erreur={erreurs.nom}
        />
        <ChampTelephone
          libelle="Téléphone"
          valeur={telephone}
          onChange={(valeur) => {
            setTelephone(valeur);
            setErreurs((ancien) => ({ ...ancien, telephone: null }));
          }}
          erreur={erreurs.telephone}
        />

        <div className="champ">
          <span className="champ__libelle">Adresse du destinataire</span>
          <button
            type="button"
            className={`bloc-adresse${erreurs.lieu ? ' bloc-adresse--erreur' : ''}`}
            onClick={() => setRechercheOuverte(true)}
          >
            <span className="rond-icone rond-icone--noir">{lieu ? <MapPin size={19} /> : <Search size={19} />}</span>
            {lieu ? (
              <span className="extensible">
                <span className="une-ligne" style={{ display: 'block', fontSize: 15.5, fontWeight: 700 }}>
                  {descriptionLieu(lieu)}
                </span>
                <span className="texte-secondaire" style={{ display: 'block', fontSize: 12.5 }}>
                  Abidjan, Côte d'Ivoire
                </span>
                <span className="rangee" style={{ gap: 5, marginTop: 2, fontSize: 12, fontWeight: 600, color: 'var(--succes-texte)' }}>
                  <Check size={13} /> Adresse validée
                </span>
              </span>
            ) : (
              <span className="extensible texte-discret" style={{ fontSize: 15 }}>
                Rechercher une rue, un quartier, un repère…
              </span>
            )}
            {lieu && (
              <span className="texte-secondaire demi-gras" style={{ fontSize: 13 }}>
                Modifier
              </span>
            )}
          </button>
          {erreurs.lieu && <p className="champ__erreur">{erreurs.lieu}</p>}
        </div>

        <div className="rangee" style={{ gap: 12, marginTop: 2 }}>
          <span className="rond-icone">
            <Smartphone size={19} />
          </span>
          <div>
            <p className="demi-gras" style={{ fontSize: 14.5 }}>
              SMS au destinataire
            </p>
            <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
              Lien de suivi et code de remise
            </p>
          </div>
        </div>
      </form>

      <ChoixLieu
        ouverte={rechercheOuverte}
        onFermer={() => setRechercheOuverte(false)}
        titre="Adresse du destinataire"
        onChoisir={(nouveau) => {
          setLieu(nouveau);
          setErreurs((e) => ({ ...e, lieu: null }));
        }}
      />
    </Page>
  );
}

/** Bandeau coloré « (MT) Mariam Traoré · 1 colis · Moyen » (modification). */
function BandeauDestinataire({ destinataire, rang }) {
  const [fond, texte] = teinteDuRang(rang);
  const formats = [...new Set(destinataire.colis.map((c) => c.format?.libelle).filter(Boolean))].join(', ');
  return (
    <div className="bandeau-destinataire" style={{ background: fond }}>
      <AvatarInitiales nom={destinataire.nom} taille={44} fond="var(--blanc)" couleur={texte} />
      <div>
        <p style={{ fontSize: 15, fontWeight: 700 }}>{destinataire.nom}</p>
        <p style={{ fontSize: 12.5, fontWeight: 600, color: texte }}>
          {destinataire.colis.length} colis{formats ? ` · ${formats}` : ''}
        </p>
      </div>
    </div>
  );
}

/** « Mariam Traoré » -> « Mariam T. » */
function nomCourt(nom) {
  const mots = nom.trim().split(/\s+/);
  return mots.length === 1 ? mots[0] : `${mots[0]} ${mots[mots.length - 1][0]}.`;
}

/** Rangée « RÉCENTS » : un rond par destinataire déjà servi. */
function Recents({ liste, choisi, onChoisir }) {
  return (
    <div>
      <p className="etiquette-section" style={{ marginBottom: 10 }}>
        Récents
      </p>
      <div className="recents">
        {liste.map((recent) => {
          const actif = choisi === recent.nom;
          return (
            <button
              type="button"
              key={`${recent.nom}-${recent.telephone}`}
              className={`recent${actif ? ' recent--choisi' : ''}`}
              onClick={() => onChoisir(recent)}
              aria-pressed={actif}
            >
              <span className="recent__anneau">
                <span
                  className="avatar"
                  style={{
                    width: 50,
                    height: 50,
                    fontSize: 16,
                    background: actif ? 'var(--encre)' : 'var(--surface-alt)',
                    color: actif ? 'var(--blanc)' : 'var(--encre)',
                  }}
                >
                  {initiales(recent.nom)}
                </span>
              </span>
              <span className="une-ligne" style={{ maxWidth: 70 }}>
                {nomCourt(recent.nom)}
              </span>
            </button>
          );
        })}
      </div>
      <div className="separateur-texte">ou saisissez ses coordonnées</div>
    </div>
  );
}
