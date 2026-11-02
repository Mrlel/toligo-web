import { useEffect, useState } from 'react';
import { Lock } from 'lucide-react';

import { ApiErreur } from '../../api/client';
import { Bouton, Champ, ChampSelection, Chargement, EnTete, Page, PiedDAction, useMessages, useRetour } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { afficher as afficherTelephone } from '../../utils/telephone';
import { modifierProfil } from './api';

/**
 * Informations personnelles : nom et e-mail (le numéro se change par un
 * parcours avec code SMS, pas encore maquetté).
 */
export default function InformationsPage() {
  const retour = useRetour(Routes.profil);
  const { profil, rechargerProfil } = useSession();
  const { afficherMessage, afficherErreur } = useMessages();

  const [nom, setNom] = useState('');
  const [email, setEmail] = useState('');
  const [initialise, setInitialise] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);

  // Le formulaire part du profil, une fois chargé.
  useEffect(() => {
    if (profil && !initialise) {
      setNom(profil.nomComplet);
      setEmail(profil.email ?? '');
      setInitialise(true);
    }
  }, [profil, initialise]);

  async function enregistrer() {
    if (nom.trim().length < 2) {
      setErreurs({ nom_complet: 'Saisissez votre nom.' });
      return;
    }
    setErreurs({});
    setEnCours(true);
    try {
      await modifierProfil({ nomComplet: nom.trim(), email: email.trim() });
      rechargerProfil();
      afficherMessage('Informations enregistrées.');
      retour();
    } catch (erreur) {
      if (erreur instanceof ApiErreur) {
        setErreurs({ nom_complet: erreur.erreurDe('nom_complet'), email: erreur.erreurDe('email') });
      }
      afficherErreur(erreur);
      setEnCours(false);
    }
  }

  return (
    <Page
      titre="Informations personnelles"
      entete={<EnTete titre="Informations personnelles" repli={Routes.profil} />}
      pied={
        <PiedDAction>
          <Bouton enCours={enCours} disabled={!initialise} onClick={enregistrer}>
            Enregistrer
          </Bouton>
        </PiedDAction>
      }
    >
      {!initialise ? (
        <Chargement />
      ) : (
        <form
          className="pile"
          style={{ gap: 18, paddingTop: 8 }}
          noValidate
          onSubmit={(evenement) => {
            evenement.preventDefault();
            enregistrer();
          }}
        >
          <Champ libelle="Nom complet" autoComplete="name" value={nom} onChange={(e) => setNom(e.target.value)} erreur={erreurs.nom_complet} />
          <Champ
            libelle="E-mail"
            facultatif
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            erreur={erreurs.email}
          />
          <ChampSelection
            libelle="Numéro de téléphone"
            valeur={`+225 ${afficherTelephone(profil.telephone)}`}
            icone={Lock}
            onClick={() => afficherMessage('Le changement de numéro arrive dans une prochaine version.')}
          />
        </form>
      )}
    </Page>
  );
}
