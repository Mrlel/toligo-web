import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { ApiErreur } from '../../api/client';
import { Bouton, ChampMotDePasse, ChampTelephone, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { normaliser, valider as validerTelephone } from '../../utils/telephone';
import { connecter } from './api';
import { CadreAuthentification, ID_FORMULAIRE } from './CadreAuthentification';

/** Maquette A-Connexion. */
export default function ConnexionPage() {
  const naviguer = useNavigate();
  const { ouvrir } = useSession();
  const { afficherErreur } = useMessages();

  const [telephone, setTelephone] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);

  async function seConnecter() {
    const nouvellesErreurs = {
      telephone: validerTelephone(telephone),
      motDePasse: motDePasse ? null : 'Saisissez votre mot de passe.',
    };
    setErreurs(nouvellesErreurs);
    if (nouvellesErreurs.telephone || nouvellesErreurs.motDePasse) return;

    const numero = normaliser(telephone);
    setEnCours(true);
    try {
      // Une fois la session ouverte, l'application bascule d'elle-même vers l'accueil.
      ouvrir(await connecter(numero, motDePasse));
    } catch (erreur) {
      setEnCours(false);
      if (erreur instanceof ApiErreur && erreur.action === 'verify_otp') {
        // Compte créé mais numéro jamais vérifié : on termine l'inscription.
        naviguer(Routes.code, { state: { telephone: numero } });
      } else {
        afficherErreur(erreur);
      }
    }
  }

  return (
    <CadreAuthentification
      titreDocument="Connexion"
      coin="parachute"
      onSoumettre={seConnecter}
      pied={
        <>
          <Bouton type="submit" form={ID_FORMULAIRE} enCours={enCours}>
            Se connecter
          </Bouton>
          <p className="auth__lien-bas">
            Pas encore de compte ?
            <Link to={Routes.inscription} replace>
              Créer un compte
            </Link>
          </p>
        </>
      }
    >
      <h1 className="auth__titre" style={{ marginTop: 56 }}>
        Bon retour
      </h1>
      <p className="auth__texte">Connectez-vous pour suivre vos colis et accéder à vos box.</p>

      <div className="auth__formulaire" style={{ marginTop: 26, gap: 16 }}>
        <ChampTelephone
          valeur={telephone}
          onChange={(valeur) => {
            setTelephone(valeur);
            setErreurs((ancien) => ({ ...ancien, telephone: null }));
          }}
          erreur={erreurs.telephone}
          autoFocus
        />
        <div>
          <ChampMotDePasse
            value={motDePasse}
            onChange={(e) => {
              setMotDePasse(e.target.value);
              setErreurs((ancien) => ({ ...ancien, motDePasse: null }));
            }}
            erreur={erreurs.motDePasse}
            autoComplete="current-password"
          />
          <div style={{ textAlign: 'right', marginTop: 4 }}>
            <Link to={Routes.motDePasseOublie} className="lien lien--accent">
              Mot de passe oublié ?
            </Link>
          </div>
        </div>
      </div>
    </CadreAuthentification>
  );
}
