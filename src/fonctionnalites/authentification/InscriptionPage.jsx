import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

import { ApiErreur } from '../../api/client';
import { Bouton, CaseACocher, Champ, ChampMotDePasse, ChampTelephone, Modale, Pastille, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { normaliser, valider as validerTelephone } from '../../utils/telephone';
import { inscrire } from './api';
import { CadreAuthentification, ID_FORMULAIRE } from './CadreAuthentification';
import { SceneColis } from '../../commun/Scenes';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Maquette A-Inscription. */
export default function InscriptionPage() {
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();

  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [cgu, setCgu] = useState(false);
  const [conditionsOuvertes, setConditionsOuvertes] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);

  const identiques = confirmation !== '' && confirmation === motDePasse;

  /** Met à jour un champ et efface son message d'erreur. */
  const saisir = (modifier, cle) => (valeur) => {
    modifier(valeur);
    setErreurs((ancien) => ({ ...ancien, [cle]: null }));
  };

  async function sInscrire() {
    // Contrôles locaux, avant d'appeler le serveur.
    const locales = {
      nom_complet: nom.trim().length < 2 ? 'Saisissez votre nom.' : null,
      telephone: validerTelephone(telephone),
      email: email.trim() && !EMAIL.test(email.trim()) ? 'Adresse e-mail invalide.' : null,
      password: motDePasse.length < 8 ? '8 caractères minimum.' : null,
      confirmation: confirmation !== motDePasse ? 'Les deux mots de passe ne sont pas identiques.' : null,
    };
    setErreurs(locales);
    if (Object.values(locales).some(Boolean)) return;
    if (!cgu) {
      afficherMessage('Acceptez les conditions générales pour continuer.');
      return;
    }

    const numero = normaliser(telephone);
    setEnCours(true);
    try {
      const renvoiPossibleLe = await inscrire({
        nomComplet: nom.trim(),
        telephone: numero,
        email: email.trim(),
        motDePasse,
        confirmation,
      });
      naviguer(Routes.code, { state: { telephone: numero, renvoiPossibleLe: renvoiPossibleLe?.toISOString() } });
    } catch (erreur) {
      // Erreurs du serveur affichées sous les champs concernés.
      if (erreur instanceof ApiErreur) {
        setErreurs({
          nom_complet: erreur.erreurDe('nom_complet'),
          telephone: erreur.erreurDe('telephone'),
          email: erreur.erreurDe('email'),
          password: erreur.erreurDe('password'),
        });
      }
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <CadreAuthentification
      titreDocument="Créer un compte"
      scene={<SceneColis />}
      onSoumettre={sInscrire}
      pied={
        <Bouton type="submit" form={ID_FORMULAIRE} enCours={enCours}>
          Recevoir le code par SMS
        </Bouton>
      }
    >
      <h1 className="auth__titre" style={{ marginTop: 16, fontSize: 26 }}>
        Créer votre compte
      </h1>
      <p className="auth__texte" style={{ marginTop: 6, fontSize: 14.5 }}>
        Quelques informations pour organiser vos envois.
      </p>

      <div className="auth__formulaire" style={{ marginTop: 16, gap: 12 }}>
        <Champ
          libelle="Nom complet"
          placeholder="Aya Koné"
          autoComplete="name"
          autoCapitalize="words"
          value={nom}
          onChange={(e) => saisir(setNom, 'nom_complet')(e.target.value)}
          erreur={erreurs.nom_complet}
          autoFocus
        />
        <ChampTelephone
          valeur={telephone}
          onChange={saisir(setTelephone, 'telephone')}
          erreur={erreurs.telephone}
          aide="Un numéro vérifié permet de proposer le paiement à la livraison."
        />
        <Champ
          libelle="E-mail"
          facultatif
          type="email"
          placeholder="vous@exemple.ci"
          autoComplete="email"
          value={email}
          onChange={(e) => saisir(setEmail, 'email')(e.target.value)}
          erreur={erreurs.email}
        />
        <ChampMotDePasse
          precision="8 caractères minimum"
          autoComplete="new-password"
          value={motDePasse}
          onChange={(e) => saisir(setMotDePasse, 'password')(e.target.value)}
          erreur={erreurs.password}
        />
        <ChampMotDePasse
          libelle="Confirmer le mot de passe"
          autoComplete="new-password"
          value={confirmation}
          onChange={(e) => saisir(setConfirmation, 'confirmation')(e.target.value)}
          erreur={erreurs.confirmation}
          // Tant que les deux saisies diffèrent, on garde l'œil pour vérifier sa frappe.
          suffixe={
            identiques ? (
              <span style={{ paddingRight: 6 }}>
                <Pastille ton="succes" icone={Check}>
                  Identiques
                </Pastille>
              </span>
            ) : undefined
          }
        />

        <button type="button" className="conditions" role="checkbox" aria-checked={cgu} onClick={() => setCgu(!cgu)}>
          <CaseACocher cochee={cgu} />
          <span>
            J'accepte les{' '}
            <span
              className="lien-conditions"
              role="link"
              tabIndex={0}
              onClick={(evenement) => {
                evenement.stopPropagation();
                setConditionsOuvertes(true);
              }}
              onKeyDown={(evenement) => {
                if (evenement.key === 'Enter') {
                  evenement.stopPropagation();
                  setConditionsOuvertes(true);
                }
              }}
            >
              conditions générales
            </span>
            , notamment la déclaration du format de mes colis.
          </span>
        </button>
      </div>

      <Modale
        ouverte={conditionsOuvertes}
        onFermer={() => setConditionsOuvertes(false)}
        titre="Conditions générales"
        pied={<Bouton onClick={() => setConditionsOuvertes(false)}>Compris</Bouton>}
      >
        <p className="modale__texte">
          Les conditions générales seront bientôt consultables ici. Elles prévoient notamment que vous déclarez le format de
          vos colis : il est vérifié par pesée à la station de départ, et le prix ajusté s'il change.
        </p>
      </Modale>
    </CadreAuthentification>
  );
}
