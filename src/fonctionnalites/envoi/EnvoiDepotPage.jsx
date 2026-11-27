import { Navigate, useNavigate } from 'react-router-dom';

import { BarreEtapes, Bouton, EnTete, Page, PiedDAction } from '../../composants';
import { Routes } from '../../commun/routes';
import { ChoixDepot } from './ChoixDepot';
import { etapesEnvoi, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Étape « Dépôt » (§9.1, révision du 26/11/2026) : l'expéditeur choisit
 * directement, parmi les entrepôts proches de son adresse, celui où il
 * apportera ses colis. Le camion de la station qui le dessert viendra les y
 * prendre ; le client ne voit pas les stations.
 *
 * Le choix est facultatif : avec « Laisser Tôligo choisir », le serveur retient
 * l'entrepôt le plus proche à la confirmation. Il arrive avant la réception,
 * qui enregistre le brouillon sur le serveur.
 */
export default function EnvoiDepotPage() {
  const naviguer = useNavigate();
  const { brouillon, choisirDepot } = useEnvoi();

  const destinataire = brouillon.destinataires[0];
  if (!destinataire || !brouillon.collecte) return <Navigate to={Routes.envoi} replace />;

  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" gris repli={Routes.envoiColis} />}
      pied={
        <PiedDAction arrondi>
          <Bouton onClick={() => naviguer(Routes.envoiReception)}>Continuer</Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={2} />
      <h2 className="envoi__question" style={{ marginTop: 12 }}>
        Où déposez-vous vos colis ?
      </h2>

      <ChoixDepot position={brouillon.collecte} choix={brouillon.depot} onChoisir={choisirDepot} />

    </Page>
  );
}
