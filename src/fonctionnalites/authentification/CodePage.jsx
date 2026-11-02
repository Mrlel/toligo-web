import { useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Smartphone } from 'lucide-react';

import { Bouton, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { afficher as afficherTelephone } from '../../utils/telephone';
import { renvoyerCode, verifierCode } from './api';
import { CadreAuthentification, ID_FORMULAIRE } from './CadreAuthentification';

const LONGUEUR = 4;

/**
 * Maquette A-Code : saisie du code reçu par SMS. La maquette montre 6 cases,
 * mais le serveur envoie un code à 4 chiffres (ClientAuthController).
 *
 * En développement (APP_ENV=local), le serveur n'envoie pas de SMS : le code
 * est écrit dans toligo/storage/logs/laravel.log.
 *
 * Le numéro arrive de l'écran précédent (inscription ou connexion).
 */
export default function CodePage() {
  const { state } = useLocation();
  if (!state?.telephone) return <Navigate to={Routes.connexion} replace />;
  return <SaisieCode telephone={state.telephone} renvoiInitial={state.renvoiPossibleLe} />;
}

function SaisieCode({ telephone, renvoiInitial }) {
  const naviguer = useNavigate();
  const { ouvrir } = useSession();
  const { afficherMessage, afficherErreur } = useMessages();

  const [code, setCode] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [renvoiPossibleLe, setRenvoiPossibleLe] = useState(() =>
    renvoiInitial ? new Date(renvoiInitial) : new Date(Date.now() + 60000),
  );
  const [maintenant, setMaintenant] = useState(Date.now());
  const champ = useRef(null);

  // Le compte à rebours du renvoi avance chaque seconde.
  useEffect(() => {
    const minuteur = setInterval(() => setMaintenant(Date.now()), 1000);
    return () => clearInterval(minuteur);
  }, []);

  const secondes = Math.max(0, Math.ceil((renvoiPossibleLe.getTime() - maintenant) / 1000));

  async function valider(saisie = code) {
    if (saisie.length !== LONGUEUR || enCours) return;
    setEnCours(true);
    try {
      // L'application ouvre l'accueil dès que la session est ouverte.
      ouvrir(await verifierCode(telephone, saisie));
    } catch (erreur) {
      setCode('');
      setEnCours(false);
      afficherErreur(erreur);
      champ.current?.focus();
    }
  }

  async function renvoyer() {
    try {
      const prochain = await renvoyerCode(telephone);
      setRenvoiPossibleLe(prochain ?? new Date(Date.now() + 60000));
      afficherMessage('Un nouveau code vous a été envoyé.');
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  return (
    <CadreAuthentification
      titreDocument="Vérification du numéro"
      onRetour={() => naviguer(-1)}
      onSoumettre={() => valider()}
      pied={
        <Bouton type="submit" form={ID_FORMULAIRE} enCours={enCours} disabled={code.length !== LONGUEUR}>
          Valider
        </Bouton>
      }
    >
      <div className="code__icone">
        <Smartphone size={28} />
      </div>
      <h1 className="auth__titre" style={{ marginTop: 22, fontSize: 26 }}>
        Vérifiez votre numéro
      </h1>
      <p className="auth__texte">
        Saisissez le code à {LONGUEUR} chiffres envoyé par SMS au{' '}
        <strong style={{ color: 'var(--encre)', fontWeight: 600 }}>+225 {afficherTelephone(telephone)}</strong>.
      </p>

      {/* Un champ invisible alimente les cases affichées. */}
      <div className="cases-code" style={{ marginTop: 22 }} onClick={() => champ.current?.focus()}>
        {Array.from({ length: LONGUEUR }, (_, i) => (
          <span
            key={i}
            className={`cases-code__case${i > code.length ? ' cases-code__case--vide' : ''}${i === code.length ? ' cases-code__case--courante' : ''}`}
          >
            {code[i] ?? ''}
          </span>
        ))}
        <input
          ref={champ}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={LONGUEUR}
          value={code}
          aria-label="Code reçu par SMS"
          autoFocus
          onChange={(e) => {
            const saisie = e.target.value.replace(/\D/g, '').slice(0, LONGUEUR);
            setCode(saisie);
            // Le code complet est validé sans attendre.
            if (saisie.length === LONGUEUR) valider(saisie);
          }}
        />
      </div>

      <div className="rangee" style={{ marginTop: 22, gap: 8, flexWrap: 'wrap' }}>
        <div className="extensible" style={{ fontSize: 14 }}>
          {secondes > 0 ? (
            <span className="texte-secondaire">
              Renvoyer le code dans{' '}
              <strong style={{ color: 'var(--encre)', fontWeight: 600 }}>
                {Math.floor(secondes / 60)}:{String(secondes % 60).padStart(2, '0')}
              </strong>
            </span>
          ) : (
            <button type="button" className="lien" style={{ paddingLeft: 0 }} onClick={renvoyer}>
              Renvoyer le code
            </button>
          )}
        </div>
        <button type="button" className="lien" onClick={() => naviguer(-1)}>
          Modifier le numéro
        </button>
      </div>
    </CadreAuthentification>
  );
}
