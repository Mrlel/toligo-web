import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';

import { Bouton, Page, Roue } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { verifierPaiement } from './paiement';
import './paiement.css';

/**
 * Page ouverte par GeniusPay une fois le paiement terminé (/paiement-check,
 * adresse de retour configurée côté serveur).
 *
 * Elle s'affiche dans l'onglet de paiement : l'onglet Tôligo d'origine, lui,
 * vérifie le paiement de son côté et passe tout seul à la confirmation.
 */
export default function PaiementRetourPage() {
  const naviguer = useNavigate();
  const { estConnecte } = useSession();
  const [parametres] = useSearchParams();
  const reference = parametres.get('reference') ?? parametres.get('ref') ?? parametres.get('payment_reference');
  const [etat, setEtat] = useState(reference && estConnecte ? 'verification' : 'termine');

  // Si GeniusPay donne la référence, on confirme le paiement tout de suite.
  useEffect(() => {
    if (!reference || !estConnecte) return;
    verifierPaiement(reference).then((paye) => setEtat(paye ? 'paye' : 'termine'));
  }, [reference, estConnecte]);

  return (
    <Page titre="Paiement">
      <div className="retour-paiement">
        {etat === 'verification' ? (
          <>
            <Roue taille="grande" />
            <h1>Vérification du paiement…</h1>
          </>
        ) : (
          <>
            <div className="retour-paiement__icone">
              <span>
                <Check size={30} strokeWidth={2.5} />
              </span>
            </div>
            <h1>{etat === 'paye' ? 'Paiement reçu' : 'Paiement terminé'}</h1>
            <p>
              Vous pouvez fermer cet onglet et revenir à Tôligo : votre commande se met à jour automatiquement dans quelques
              instants.
            </p>
          </>
        )}
        <div style={{ width: '100%', marginTop: 8 }}>
          <Bouton onClick={() => naviguer(estConnecte ? Routes.envois : Routes.connexion)}>
            {estConnecte ? 'Voir mes envois' : 'Se connecter'}
          </Bouton>
        </div>
      </div>
    </Page>
  );
}
