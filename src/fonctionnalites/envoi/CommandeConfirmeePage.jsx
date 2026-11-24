import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy } from 'lucide-react';

import { Bouton, Carte, EncadreInfo, IconeBox, Page, Pastille, PiedDAction, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { prenom, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { detailCommande, libelleModeReception } from './api';
import { CodeReception } from './CodeReception';
import './envoi.css';

/** Nom lisible du moyen de paiement enregistré. */
function moyenLisible(moyen) {
  const noms = {
    geniuspay: 'mobile money',
    orange_money: 'Orange Money',
    orange: 'Orange Money',
    mtn: 'MTN MoMo',
    mtn_momo: 'MTN MoMo',
    moov: 'Moov Money',
    moov_money: 'Moov Money',
    wave: 'Wave',
  };
  return moyen ? (noms[moyen] ?? moyen) : 'mobile money';
}

/**
 * Maquette A-Confirmee : commande confirmée, et le code de dépôt de la
 * commande (audit §24). Le client se présente avec ses colis à l'entrepôt
 * indiqué et donne ce code au gestionnaire, qui les range dans leurs box.
 *
 * Sans box libre pour tous les colis, le code n'est pas encore émis : Tôligo
 * prévient le client dès qu'il est prêt.
 */
export default function CommandeConfirmeePage() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const { afficherMessage } = useMessages();
  const commande = useDonnees(() => detailCommande(id), [id]);

  async function copier(texte, quoi) {
    try {
      await navigator.clipboard.writeText(texte);
      afficherMessage(`${quoi} copié.`);
    } catch {
      afficherMessage(`${quoi} : ${texte}`);
    }
  }

  return (
    <Page
      titre="Commande confirmée"
      pied={
        <PiedDAction>
          <Bouton onClick={() => naviguer(Routes.envois)}>Suivre mes colis</Bouton>
          <Bouton variante="secondaire" onClick={() => naviguer(Routes.accueil)}>
            Retour à l'accueil
          </Bouton>
        </PiedDAction>
      }
    >
      <VueDonnees etat={commande}>
        {(donnees) => {
          const aLaLivraison = donnees.modeReglement === 'a_la_livraison';
          const code = donnees.codeReception;

          return (
            <div className="confirmee">
              <div className="illustration-confirmee">
                <span className="illustration-confirmee__disque" />
                <img src="/illustrations/parachute.png" alt="" />
                <span className="illustration-confirmee__coche">
                  <Check size={22} strokeWidth={3} />
                </span>
              </div>
              <h1 style={{ fontSize: 26, letterSpacing: -0.4, marginTop: 20 }}>Commande confirmée</h1>
              <p className="texte-secondaire" style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>
                {code
                  ? 'Apportez vos colis à l’entrepôt indiqué et donnez votre code de dépôt au gestionnaire.'
                  : 'Nous réservons la place de vos colis à l’entrepôt et vous prévenons dès que votre code de dépôt est prêt.'}
              </p>

              <div style={{ marginTop: 20 }}>
                {code ? (
                  <CodeReception code={code.code} expireLe={code.expireLe} site={donnees.siteDepot} />
                ) : (
                  <EncadreInfo>Code de dépôt en préparation : vous recevrez une notification dès qu’il est prêt.</EncadreInfo>
                )}
              </div>

              <Carte style={{ padding: 16, marginTop: 16, textAlign: 'left' }}>
                <div className="rangee" style={{ gap: 8 }}>
                  <span className="etiquette-section extensible" style={{ fontSize: 13, letterSpacing: 0.6 }}>
                    Vos colis
                  </span>
                  <Pastille ton="accent">{code ? 'À déposer' : 'En préparation'}</Pastille>
                </div>

                {donnees.colis.map((colis, i) => (
                  <div key={colis.id} className="rangee" style={{ gap: 12, marginTop: 14 }}>
                    <span className="rond-icone">
                      <IconeBox size={19} />
                    </span>
                    <p className="extensible demi-gras" style={{ fontSize: 14.5 }}>
                      Colis {i + 1} · {colis.format?.libelle ?? ''}
                    </p>
                    <button type="button" className="code-suivi" onClick={() => copier(colis.codeSuivi, 'Numéro de suivi')} title="Copier le numéro de suivi">
                      {colis.codeSuivi}
                      <Copy size={14} />
                    </button>
                  </div>
                ))}

                <hr className="separateur" style={{ margin: '12px 0' }} />
                <div className="rangee" style={{ gap: 12, fontSize: 14 }}>
                  <span className="extensible texte-secondaire">{aLaLivraison ? 'À payer par le destinataire' : 'Payé'}</span>
                  <span className="gras">
                    {aLaLivraison
                      ? prix(donnees.montantTotal)
                      : `${prix(donnees.paiement?.montant ?? donnees.montantTotal)} · ${moyenLisible(donnees.paiement?.moyen)}`}
                  </span>
                </div>
              </Carte>

              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <EncadreInfo>
                  {libelleModeReception(donnees.modeReception)}
                  {donnees.stationArrivee ? ` à ${donnees.stationArrivee.nom}` : ''}. {prenom(donnees.destinataireNom)} reçoit un SMS dès
                  l’arrivée du colis.
                </EncadreInfo>
              </div>
            </div>
          );
        }}
      </VueDonnees>
    </Page>
  );
}
