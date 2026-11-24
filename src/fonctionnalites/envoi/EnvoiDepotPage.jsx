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
              {site ? `Dépôt à ${site.nom}` : 'Tôligo choisira l’entrepôt le plus proche'}
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
      <p className="envoi__sous-titre">Vous les apportez au gestionnaire de l’entrepôt, qui les range dans leurs box</p>

      <ChoixDepot
        position={brouillon.collecte}
        formats={formats}
        choix={brouillon.depot}
        onChoisir={choisirDepot}
      />

      <div style={{ marginTop: 14 }}>
        <EncadreInfo>
          Votre code de dépôt vous est donné après le paiement : présentez-le au gestionnaire de l'entrepôt avec vos colis.
          Si le site choisi n'a plus de place à ce moment-là, Tôligo vous en propose un autre dans la même station et vous
          prévient.
        </EncadreInfo>
      </div>
    </Page>
  );
}
