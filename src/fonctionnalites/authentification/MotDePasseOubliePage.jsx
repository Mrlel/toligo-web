import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ApiErreur } from '../../api/client';
import { Bouton, Champ, ChampMotDePasse, ChampTelephone, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { afficher as afficherTelephone, normaliser, valider as validerTelephone } from '../../utils/telephone';
import {
  definirMotDePasse,
  demanderReinitialisation,
  renvoyerCodeReinitialisation,
  verifierCodeReinitialisation,
} from './api';
import { CadreAuthentification, ID_FORMULAIRE } from './CadreAuthentification';

/** Textes de chaque étape : titre, explication, bouton. */
const ETAPES = {
  telephone: ['Mot de passe oublié', 'Saisissez votre numéro : nous vous envoyons un code par SMS.', 'Recevoir le code'],
  code: ['Saisissez le code', null, 'Vérifier le code'],
  motDePasse: ['Nouveau mot de passe', "Choisissez un mot de passe d'au moins 8 caractères.", 'Enregistrer'],
};

/**
 * Mot de passe oublié, en trois étapes : numéro, code SMS, nouveau mot de
 * passe. Aucune maquette n'existe pour ce parcours : écran sobre, au style
 * des autres.
 */
export default function MotDePasseOubliePage() {
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();

  const [etape, setEtape] = useState('telephone');
  const [telephone, setTelephone] = useState('');
  const [numero, setNumero] = useState(null);
  const [code, setCode] = useState('');
  const [jeton, setJeton] = useState(null);
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState(null);
  const [enCours, setEnCours] = useState(false);

  /** Contrôle local de l'étape en cours ; renvoie un message ou null. */
  function verifierSaisie() {
    if (etape === 'telephone') return validerTelephone(telephone);
    if (etape === 'code') return code.length !== 4 ? 'Le code compte 4 chiffres.' : null;
    if (motDePasse.length < 8) return '8 caractères minimum.';
    if (confirmation !== motDePasse) return 'Les deux mots de passe ne sont pas identiques.';
    return null;
  }

  async function suivant() {
    const probleme = verifierSaisie();
    setErreur(probleme);
    if (probleme) return;

    setEnCours(true);
    try {
      if (etape === 'telephone') {
        const normalise = normaliser(telephone);
        await demanderReinitialisation(normalise);
        setNumero(normalise);
        setEtape('code');
      } else if (etape === 'code') {
        setJeton(await verifierCodeReinitialisation(numero, code));
        setEtape('motDePasse');
      } else {
        await definirMotDePasse({ telephone: numero, jeton, motDePasse, confirmation });
        afficherMessage('Mot de passe modifié. Vous pouvez vous connecter.');
        naviguer(Routes.connexion, { replace: true });
        return;
      }
    } catch (e) {
      // Jeton expiré : on recommence depuis le début.
      if (e instanceof ApiErreur && e.action === 'forgot_password') setEtape('telephone');
      afficherErreur(e);
    } finally {
      setEnCours(false);
    }
  }

  async function renvoyer() {
    try {
      await renvoyerCodeReinitialisation(numero);
      afficherMessage('Nouveau code envoyé.');
    } catch (e) {
      afficherErreur(e);
    }
  }

  const [titre, texte, bouton] = ETAPES[etape];

  return (
    <CadreAuthentification
      titreDocument="Mot de passe oublié"
      onSoumettre={suivant}
      pied={
        <Bouton type="submit" form={ID_FORMULAIRE} enCours={enCours}>
          {bouton}
        </Bouton>
      }
    >
      <h1 className="auth__titre" style={{ marginTop: 24, fontSize: 24 }}>
        {titre}
      </h1>
      <p className="auth__texte">{texte ?? `Code à 4 chiffres envoyé au +225 ${afficherTelephone(numero)}.`}</p>

      <div className="auth__formulaire" style={{ marginTop: 24, gap: 18 }}>
        {etape === 'telephone' && <ChampTelephone valeur={telephone} onChange={setTelephone} erreur={erreur} autoFocus />}

        {etape === 'code' && (
          <div>
            <Champ
              libelle="Code reçu par SMS"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={4}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              erreur={erreur}
              autoFocus
            />
            <button type="button" className="lien" style={{ marginTop: 8, paddingLeft: 0 }} onClick={renvoyer}>
              Renvoyer le code
            </button>
          </div>
        )}

        {etape === 'motDePasse' && (
          <>
            <ChampMotDePasse
              libelle="Nouveau mot de passe"
              autoComplete="new-password"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              autoFocus
            />
            <ChampMotDePasse
              libelle="Confirmer le mot de passe"
              autoComplete="new-password"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              erreur={erreur}
            />
          </>
        )}
      </div>
    </CadreAuthentification>
  );
}
