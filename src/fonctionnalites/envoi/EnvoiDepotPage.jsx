import { Navigate, useNavigate } from 'react-router-dom';

import { BarreEtapes, Bouton, EncadreInfo, EnTete, Page, PiedDAction } from '../../composants';
import { Routes } from '../../commun/routes';
import { ChoixDepot } from './ChoixDepot';
import { etapesEnvoi, tousLesColis, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Étape « Dépôt » (§9.1, révision du 13/11/2026) : l'expéditeur choisit la
 * station qui l'arrange, puis le site où il déposera ses colis en box de
 * réception. Le camion de cette station viendra les y prendre.
 *
 * Le choix est facultatif — « Laisser Tôligo choisir » garde le comportement
 * d'origine. Il arrive après les colis parce que la disponibilité d'un site
 * dépend du format de chacun d'eux, et avant la réception, qui enregistre le
 * brouillon sur le serveur.
 */
export default function EnvoiDepotPage() {
  const naviguer = useNavigate();
  const { brouillon, choisirDepot } = useEnvoi();

  const destinataire = brouillon.destinataires[0];
  if (!destinataire || !brouillon.collecte) return <Navigate to={Routes.envoi} replace />;

  const formats = tousLesColis(brouillon)
    .map((colis) => colis.format?.id)
    .filter(Boolean);

  const site = brouillon.depot?.site ?? null;

  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" gris repli={Routes.envoiColis} />}
      pied={
        <PiedDAction
          arrondi
          entete={
            <span className="extensible texte-secondaire" style={{ fontSize: 13.5 }}>
              {site ? `Dépôt à ${site.nom}` : 'Tôligo choisira le box le plus proche'}
            </span>
          }
        >
          <Bouton onClick={() => naviguer(Routes.envoiReception)}>Continuer</Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={2} />
      <h2 className="envoi__question" style={{ marginTop: 12 }}>
        Où déposez-vous vos colis ?
      </h2>
      <p className="envoi__sous-titre">Le camion de la station passe les prendre dans le box où vous les déposez</p>

      <ChoixDepot
        position={brouillon.collecte}
        formats={formats}
        choix={brouillon.depot}
        onChoisir={choisirDepot}
      />

      <div style={{ marginTop: 14 }}>
        <EncadreInfo>
          Le box exact et son code d'ouverture vous sont donnés après le paiement. Si le site choisi n'a plus de box
          libre à ce moment-là, Tôligo vous en propose un autre dans la même station et vous prévient.
        </EncadreInfo>
      </div>
    </Page>
  );
}
