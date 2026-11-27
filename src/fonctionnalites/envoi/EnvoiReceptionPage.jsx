import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Store, Truck } from 'lucide-react';

import { BarreEtapes, Bouton, Cascade, EnTete, IconeBox, Option, Page, PiedDAction, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { prenom } from '../../utils/formatage';
import { MODES_RECEPTION, refusDuLieuDeDepot } from './api';
import { etapesEnvoi, useEnvoi } from './EtatEnvoi';
import './envoi.css';

const ICONES = {
  retrait_station: Store,
  livraison_domicile: Truck,
  box_stockage: IconeBox,
};

/**
 * Étape « Réception » (workflow V3.3) : comment le destinataire reçoit ses
 * colis, pour toute la commande.
 *
 * En continuant, le brouillon est créé (ou remplacé) sur le serveur, qui
 * choisit la station d'arrivée et calcule l'estimation : grille des formats et
 * supplément du mode (distance × prix au km à domicile, location en box). S'il
 * refuse le mode (adresse trop loin, tarif pas encore fixé), son message
 * s'affiche ici.
 */
export default function EnvoiReceptionPage() {
  const naviguer = useNavigate();
  const { afficherErreur } = useMessages();
  const { brouillon, choisirModeReception, enregistrerBrouillon } = useEnvoi();
  const [enCours, setEnCours] = useState(false);

  const destinataire = brouillon.destinataires[0];
  if (!destinataire || !brouillon.collecte) return <Navigate to={Routes.envoi} replace />;

  async function continuer() {
    setEnCours(true);
    try {
      await enregistrerBrouillon();
      naviguer(Routes.envoiRecap);
    } catch (erreur) {
      afficherErreur(erreur);
      // §9.1 : un refus qui porte sur le lieu de dépôt (station hors zone,
      // site détaché) se corrige à l'étape précédente.
      if (refusDuLieuDeDepot(erreur)) naviguer(Routes.envoiDepot);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" gris repli={Routes.envoiDepot} />}
      pied={
        <PiedDAction arrondi>
          <Bouton enCours={enCours} onClick={continuer}>
            Continuer
          </Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={3} />
      <h2 className="envoi__question" style={{ marginTop: 12 }}>
        Comment {prenom(destinataire.nom)} reçoit-il ses colis ?
      </h2>

      <Cascade className="pile" style={{ gap: 10, marginTop: 14 }}>
        {MODES_RECEPTION.map((mode) => {
          const Icone = ICONES[mode.code];
          const choisi = brouillon.modeReception === mode.code;
          return (
            <Option key={mode.code} choisie={choisi} onClick={() => choisirModeReception(mode.code)}>
              <div className="choix-carte">
                <span className={`rond-icone${choisi ? ' rond-icone--noir' : ''}`}>
                  <Icone size={19} />
                </span>
                <div>
                  <p className="demi-gras" style={{ fontSize: 15 }}>
                    {mode.libelle}
                  </p>
                  <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                    {mode.detail}
                  </p>
                </div>
              </div>
            </Option>
          );
        })}
      </Cascade>

    </Page>
  );
}
