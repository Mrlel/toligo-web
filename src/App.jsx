import { useEffect } from 'react';
import { MotionConfig } from 'motion/react';
import { BrowserRouter, Navigate, Outlet, Route, Routes as ListeRoutes, useLocation } from 'react-router-dom';

import Coquille from './commun/Coquille';
import EcransAnimes from './commun/EcransAnimes';
import { Routes } from './commun/routes';
import { FournisseurConfirmation, FournisseurMessages } from './composants';
import { FournisseurSession, useSession } from './session/Session';

import AccueilPage from './fonctionnalites/accueil/AccueilPage';
import AdressesPage from './fonctionnalites/adresses/AdressesPage';
import CodePage from './fonctionnalites/authentification/CodePage';
import ConnexionPage from './fonctionnalites/authentification/ConnexionPage';
import InscriptionPage from './fonctionnalites/authentification/InscriptionPage';
import MotDePasseOubliePage from './fonctionnalites/authentification/MotDePasseOubliePage';
import BoxChoixPage from './fonctionnalites/box/BoxChoixPage';
import BoxConfirmeePage from './fonctionnalites/box/BoxConfirmeePage';
import BoxDetailPage from './fonctionnalites/box/BoxDetailPage';
import BoxObjetPage from './fonctionnalites/box/BoxObjetPage';
import CodeTemporairePage from './fonctionnalites/box/CodeTemporairePage';
import EntrepotsPage from './fonctionnalites/box/EntrepotsPage';
import MesBoxPage from './fonctionnalites/box/MesBoxPage';
import ChoixCollectePage from './fonctionnalites/envoi/ChoixCollectePage';
import ColisAjoutPage from './fonctionnalites/envoi/ColisAjoutPage';
import CommandeConfirmeePage from './fonctionnalites/envoi/CommandeConfirmeePage';
import DestinatairePage from './fonctionnalites/envoi/DestinatairePage';
import EnvoiAdressesPage from './fonctionnalites/envoi/EnvoiAdressesPage';
import EnvoiColisPage from './fonctionnalites/envoi/EnvoiColisPage';
import EnvoiReceptionPage from './fonctionnalites/envoi/EnvoiReceptionPage';
import EnvoiRecapPage from './fonctionnalites/envoi/EnvoiRecapPage';
import { FournisseurEnvoi } from './fonctionnalites/envoi/EtatEnvoi';
import PaiementCommandePage from './fonctionnalites/envoi/PaiementCommandePage';
import NotificationsPage from './fonctionnalites/notifications/NotificationsPage';
import PaiementRetourPage from './fonctionnalites/paiement/PaiementRetourPage';
import AidePage from './fonctionnalites/profil/AidePage';
import InformationsPage from './fonctionnalites/profil/InformationsPage';
import ProfilPage from './fonctionnalites/profil/ProfilPage';
import ColisLivrePage from './fonctionnalites/suivi/ColisLivrePage';
import EnvoisPage from './fonctionnalites/suivi/EnvoisPage';
import IncidentPage from './fonctionnalites/suivi/IncidentPage';
import PreuvesPage from './fonctionnalites/suivi/PreuvesPage';
import SuiviPage from './fonctionnalites/suivi/SuiviPage';
import VitrinePage from './fonctionnalites/vitrine/VitrinePage';

/** Page demandée avant la connexion (lien de suivi partagé...), rouverte ensuite. */
const CLE_DESTINATION = 'toligo_destination';

/** Écrans réservés au client connecté ; sinon, direction la page publique (vitrine). */
function RoutesPrivees() {
  const { estConnecte } = useSession();
  const { pathname, search } = useLocation();

  // Une fois connecté et arrivé à destination, on oublie la page demandée.
  useEffect(() => {
    if (!estConnecte) return;
    try {
      sessionStorage.removeItem(CLE_DESTINATION);
    } catch {
      // Rien à faire.
    }
  }, [estConnecte]);

  if (!estConnecte) {
    if (pathname !== '/' && pathname !== Routes.accueil) {
      try {
        sessionStorage.setItem(CLE_DESTINATION, pathname + search);
      } catch {
        // Sans stockage, le client arrivera sur l'accueil après connexion.
      }
    }
    return <Navigate to={Routes.vitrine} replace />;
  }
  return <Outlet />;
}

/** Page publique, connexion et inscription : inutiles une fois connecté. */
function RoutesPubliques() {
  const { estConnecte } = useSession();
  if (!estConnecte) return <EcransAnimes />;

  let destination = Routes.accueil;
  try {
    destination = sessionStorage.getItem(CLE_DESTINATION) ?? Routes.accueil;
  } catch {
    // Accueil par défaut.
  }
  return <Navigate to={destination} replace />;
}

export default function App() {
  // reducedMotion="user" : si le téléphone demande moins d'animations, les
  // glissements sont supprimés (seuls les fondus restent).
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <FournisseurSession>
          <FournisseurMessages>
            <FournisseurConfirmation>
              <ListeRoutes>
                {/* --- Accès sans compte --- */}
                <Route element={<RoutesPubliques />}>
                  <Route path={Routes.vitrine} element={<VitrinePage />} />
                  <Route path={Routes.connexion} element={<ConnexionPage />} />
                  <Route path={Routes.inscription} element={<InscriptionPage />} />
                  <Route path={Routes.code} element={<CodePage />} />
                  <Route path={Routes.motDePasseOublie} element={<MotDePasseOubliePage />} />
                </Route>

                {/* --- Retour de la page de paiement : connecté ou non --- */}
                <Route path={Routes.paiementRetour} element={<PaiementRetourPage />} />

                {/* --- Client connecté --- */}
                <Route element={<RoutesPrivees />}>
                  <Route
                    element={
                      <FournisseurEnvoi>
                        <Coquille />
                      </FournisseurEnvoi>
                    }
                  >
                    {/* Écrans principaux */}
                    <Route path={Routes.accueil} element={<AccueilPage />} />
                    <Route path={Routes.envois} element={<EnvoisPage />} />
                    <Route path={Routes.mesBox} element={<MesBoxPage />} />
                    <Route path={Routes.profil} element={<ProfilPage />} />

                    {/* Nouvel envoi */}
                    <Route path={Routes.envoi} element={<EnvoiAdressesPage />} />
                    <Route path={Routes.envoiCollecte} element={<ChoixCollectePage />} />
                    <Route path={Routes.envoiDestinataire} element={<DestinatairePage />} />
                    <Route path="/envoi/destinataire/:index" element={<DestinatairePage />} />
                    <Route path={Routes.envoiColis} element={<EnvoiColisPage />} />
                    <Route path="/envoi/colis/ajout" element={<ColisAjoutPage />} />
                    <Route path={Routes.envoiReception} element={<EnvoiReceptionPage />} />
                    <Route path={Routes.envoiRecap} element={<EnvoiRecapPage />} />
                    <Route path="/commandes/:id/paiement" element={<PaiementCommandePage />} />
                    <Route path="/commandes/:id/confirmee" element={<CommandeConfirmeePage />} />

                    {/* Suivi */}
                    <Route path="/colis/:code" element={<SuiviPage />} />
                    <Route path="/colis/:code/preuves" element={<PreuvesPage />} />
                    <Route path="/colis/:code/livre" element={<ColisLivrePage />} />
                    <Route path="/colis/:code/incident" element={<IncidentPage />} />

                    {/* Adresses, profil */}
                    <Route path={Routes.adresses} element={<AdressesPage />} />
                    <Route path={Routes.notifications} element={<NotificationsPage />} />
                    <Route path={Routes.informations} element={<InformationsPage />} />
                    <Route path={Routes.aide} element={<AidePage />} />

                    {/* Box */}
                    <Route path={Routes.entrepots} element={<EntrepotsPage />} />
                    <Route path="/box/entrepots/:id" element={<BoxObjetPage />} />
                    <Route path={Routes.boxChoix} element={<BoxChoixPage />} />
                    <Route path="/box/locations/:id/confirmee" element={<BoxConfirmeePage />} />
                    <Route path="/box/locations/:id" element={<BoxDetailPage />} />
                    <Route path="/box/locations/:id/code-temporaire" element={<CodeTemporairePage />} />
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to={Routes.accueil} replace />} />
              </ListeRoutes>
            </FournisseurConfirmation>
          </FournisseurMessages>
        </FournisseurSession>
      </BrowserRouter>
    </MotionConfig>
  );
}
