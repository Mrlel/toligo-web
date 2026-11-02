import { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Lock, Smartphone } from 'lucide-react';

import { Bouton, EncadreInfo, EnTete, Page, PiedDAction, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { AttentePaiement, fermerOnglet, ouvrirPagePaiement, preparerOngletPaiement, verifierPaiement } from '../paiement/paiement';
import { detailCommande, payerCommande } from './api';
import './envoi.css';

const OPERATEURS = [
  ['OM', 'Orange Money'],
  ['MM', 'MTN MoMo'],
  ['MV', 'Moov Money'],
  ['W', 'Wave'],
];

/**
 * Maquette A-Paiement, simplifiée (D17) : le choix de l'opérateur et du
 * numéro se fait sur la page GeniusPay, plus dans l'application. Les
 * opérateurs sont seulement affichés, pour information.
 *
 * Venant du récapitulatif, la page GeniusPay est déjà ouverte : l'écran
 * attend directement la confirmation du paiement.
 */
export default function PaiementCommandePage() {
  const { id } = useParams();
  const { state } = useLocation();
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const commande = useDonnees(() => detailCommande(id), [id]);

  const [paiement, setPaiement] = useState(state?.paiement ?? null);
  const [enCours, setEnCours] = useState(false);

  async function payer() {
    const onglet = preparerOngletPaiement();
    setEnCours(true);
    try {
      // Si un paiement récent existe déjà, le serveur renvoie le même lien.
      const nouveau = await payerCommande(id);
      setPaiement(nouveau);
      if (!ouvrirPagePaiement(nouveau.checkoutUrl, onglet)) {
        afficherMessage("Impossible d'ouvrir la page de paiement. Autorisez les fenêtres pop-up pour ce site.");
      }
    } catch (erreur) {
      fermerOnglet(onglet);
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  /**
   * Vrai dès que la commande est payée. Interroge aussi GeniusPay via le
   * serveur : en local, le webhook GeniusPay ne peut pas joindre le PC.
   */
  const estPaye = useCallback(async () => {
    if (await verifierPaiement(paiement?.referenceFournisseur)) return true;
    try {
      return (await detailCommande(id)).estPayee;
    } catch {
      return false;
    }
  }, [paiement, id]);

  const surPaye = useCallback(() => naviguer(Routes.commandeConfirmee(id), { replace: true }), [naviguer, id]);

  return (
    <Page
      titre="Paiement"
      entete={<EnTete titre="Paiement" gris onRetour={() => naviguer(Routes.envois)} />}
      pied={
        !paiement && (
          <PiedDAction arrondi>
            <Bouton variante="accent" enCours={enCours} onClick={payer}>
              Payer avec mobile money
            </Bouton>
            <p className="pied__note rangee" style={{ justifyContent: 'center', gap: 6 }}>
              <Lock size={14} /> Paiement sécurisé
            </p>
          </PiedDAction>
        )
      }
    >
      <VueDonnees etat={commande}>
        {(donnees) => (
          <div className="pile" style={{ gap: 18 }}>
            <div className="carte-montant">
              <p className="carte-montant__libelle">Montant à payer</p>
              <p className="carte-montant__valeur">{prix(donnees.montantTotal)}</p>
              <div className="carte-montant__puces">
                {donnees.colis.map((colis) => (
                  <span key={colis.id}>
                    {colis.codeSuivi} · {colis.format?.libelle ?? ''}
                  </span>
                ))}
              </div>
            </div>

            {!paiement ? (
              <>
                <div>
                  <h2 style={{ fontSize: 16, marginBottom: 10 }}>Opérateurs acceptés</h2>
                  <div className="operateurs">
                    {OPERATEURS.map(([sigle, nom]) => (
                      <div className="operateur" key={sigle}>
                        <span className="operateur__sigle">{sigle}</span>
                        {nom}
                      </div>
                    ))}
                  </div>
                </div>
                <EncadreInfo icone={Smartphone}>
                  Vous choisissez votre opérateur et votre numéro sur la page sécurisée GeniusPay, puis vous validez la demande
                  avec votre code secret.
                </EncadreInfo>
              </>
            ) : (
              <AttentePaiement estPaye={estPaye} onPaye={surPaye} onRelancer={payer} />
            )}
          </div>
        )}
      </VueDonnees>
    </Page>
  );
}
