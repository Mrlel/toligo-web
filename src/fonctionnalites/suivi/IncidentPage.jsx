import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Camera, Package, X } from 'lucide-react';

import { Bouton, Champ, EnTete, Page, PiedDAction, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { moment } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { detailColis, libelleStatutColis, signalerIncident } from './api';
import './suivi.css';

const TYPES = [
  ['colis_non_recu', 'Colis non reçu'],
  ['colis_endommage', 'Colis endommagé'],
  ['retard', 'Retard important'],
  ['probleme_paiement', 'Problème de paiement'],
  ['autre', 'Autre'],
];

/** « livré aujourd'hui à 14:41 · Plateau », ou le statut du colis. */
function contexteColis(colis) {
  if (!colis) return '';
  const lieu = colis.communeLivraison ? ` · ${colis.communeLivraison}` : '';
  if (colis.estLivre && colis.livreLe) return `livré ${moment(colis.livreLe)}${lieu}`;
  return `${libelleStatutColis(colis.statut).toLowerCase()}${lieu}`;
}

/** Maquette A-Incident : signaler un problème sur un colis. */
export default function IncidentPage() {
  const { code } = useParams();
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const colis = useDonnees(() => detailColis(code), [code]);

  const [type, setType] = useState(null);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  // Aperçu de la photo choisie, libéré quand elle change.
  useEffect(() => {
    if (!photo) {
      setApercu(null);
      return undefined;
    }
    const adresse = URL.createObjectURL(photo);
    setApercu(adresse);
    return () => URL.revokeObjectURL(adresse);
  }, [photo]);

  async function envoyer() {
    if (!type) {
      afficherMessage("Indiquez ce qui s'est passé.");
      return;
    }
    if (description.trim().length < 10) {
      setErreur('Décrivez le problème en quelques mots (10 caractères minimum).');
      return;
    }
    setErreur(null);
    setEnCours(true);
    try {
      const reference = await signalerIncident(code, { type, description: description.trim(), photo });
      afficherMessage(`Signalement ${reference ?? ''} enregistré. Nous revenons vers vous rapidement.`);
      naviguer(Routes.envois);
    } catch (e) {
      afficherErreur(e);
      setEnCours(false);
    }
  }

  const contexte = contexteColis(colis.donnees);

  return (
    <Page
      titre="Signaler un problème"
      entete={<EnTete titre="Signaler un problème" repli={Routes.colis(code)} />}
      pied={
        <PiedDAction>
          <Bouton enCours={enCours} onClick={envoyer}>
            Envoyer le signalement
          </Bouton>
          <p className="pied__note">Vous suivez le traitement depuis Mes envois.</p>
        </PiedDAction>
      }
    >
      <div className="encadre-info" style={{ alignItems: 'center', color: 'var(--encre)', fontSize: 13.5 }}>
        <Package size={18} />
        <span>
          <strong>{code}</strong>
          {contexte ? ` · ${contexte}` : ''}
        </span>
      </div>

      <h2 style={{ fontSize: 16, margin: '16px 0 10px' }}>Que s'est-il passé ?</h2>
      <div className="pile" role="radiogroup" style={{ gap: 8 }}>
        {TYPES.map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            role="radio"
            aria-checked={type === cle}
            className={`choix-type${type === cle ? ' choix-type--choisi' : ''}`}
            onClick={() => setType(cle)}
          >
            <span className="choix-type__rond" />
            {libelle}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16 }}>
        <Champ
          libelle="Décrivez le problème"
          multiligne
          lignes={3}
          bordee
          placeholder="Le carton est arrivé écrasé sur un côté."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          erreur={erreur}
        />
      </div>

      <div className="rangee" style={{ gap: 10, marginTop: 16 }}>
        {apercu ? (
          <div className="miniature">
            <img src={apercu} alt="Photo jointe" />
            <button type="button" onClick={() => setPhoto(null)} aria-label="Retirer la photo">
              <X size={14} />
            </button>
          </div>
        ) : (
          <label className="ajout-photo">
            <Camera size={20} />
            Ajouter
            <input
              type="file"
              accept="image/*"
              className="invisible"
              onChange={(e) => {
                setPhoto(e.target.files?.[0] ?? null);
                e.target.value = '';
              }}
            />
          </label>
        )}
        <span className="texte-secondaire" style={{ fontSize: 12.5 }}>
          Une photo aide à traiter le signalement (facultatif).
        </span>
      </div>
    </Page>
  );
}
