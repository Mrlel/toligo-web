import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BellRing, Check, Copy } from 'lucide-react';

import { Bouton, Carte, EncadreInfo, IconeBox, Page, Pastille, PiedDAction, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { prenom, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { detailCommande, libelleModeReception, reactiverCommande } from './api';
import { fourchetteLisible } from './ColisCommun';
import { CodeReception } from './CodeReception';
import './envoi.css';

/** « Livraison à domicile depuis la Station Plateau. » */
function phraseReception(mode, station) {
  if (!station) return `${libelleModeReception(mode)}.`;
  if (mode === 'livraison_domicile') return `Livraison à domicile depuis ${station}.`;
  if (mode === 'box_stockage') return `Box de stockage près de ${station}.`;
  return `Retrait à ${station}.`;
}

/**
 * Envoi confirmé (mise à jour du 26/11/2026) : le code de dépôt, valable
 * 48 h, et ce qui se passe au comptoir de l'entrepôt.
 *
 * Le client se présente avec ses colis ; le gestionnaire les pèse et les
 * mesure, fixe le prix réel, et le client l'accepte sur place.
 * Il paie alors sur place, ou le destinataire paiera à la livraison.
 */
export default function CommandeConfirmeePage() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const [version, setVersion] = useState(0);
  const [reactivation, setReactivation] = useState(false);
  const commande = useDonnees(() => detailCommande(id), [id, version]);

  async function copier(texte, quoi) {
    try {
      await navigator.clipboard.writeText(texte);
      afficherMessage(`${quoi} copié.`);
    } catch {
      afficherMessage(`${quoi} : ${texte}`);
    }
  }

  async function reactiver() {
    setReactivation(true);
    try {
      await reactiverCommande(id);
      afficherMessage('Envoi réactivé : voici votre nouveau code de dépôt.');
      setVersion((v) => v + 1);
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setReactivation(false);
    }
  }

  return (
    <Page
      titre="Envoi confirmé"
      pied={
        <PiedDAction>
          <Bouton onClick={() => naviguer(Routes.envois)}>Suivre mes envois</Bouton>
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
          const expiree = donnees.statut === 'expiree';
          const nbColis = donnees.nbColisDeclares ?? donnees.colis.length;

          return (
            <div className="confirmee">
              <div className="illustration-confirmee">
                <span className="illustration-confirmee__disque" />
                <img src="/illustrations/parachute.png" alt="" />
                {!expiree && (
                  <span className="illustration-confirmee__coche">
                    <Check size={22} strokeWidth={3} />
                  </span>
                )}
              </div>
              <h1 style={{ fontSize: 26, letterSpacing: -0.4, marginTop: 20 }}>{expiree ? 'Envoi expiré' : 'Envoi confirmé'}</h1>
              <p className="texte-secondaire" style={{ fontSize: 15, lineHeight: 1.5, marginTop: 8 }}>
                {expiree
                  ? 'Vos colis n’ont pas été déposés dans les 48 h. Réactivez l’envoi pour obtenir un nouveau code.'
                  : 'Apportez vos colis à l’entrepôt dans les 48 h et donnez votre code de dépôt au gestionnaire.'}
              </p>

              <div style={{ marginTop: 20 }}>
                {expiree && (
                  <div className="pile" style={{ gap: 8, textAlign: 'left' }}>
                    <EncadreInfo accent icone={BellRing}>
                      Le code de dépôt n’est plus valable. La réactivation vous en donne un nouveau, valable 48 h.
                    </EncadreInfo>
                    <Bouton variante="accent" enCours={reactivation} onClick={reactiver}>
                      Réactiver l’envoi
                    </Bouton>
                  </div>
                )}
                {!expiree && code && <CodeReception code={code.code} expireLe={code.expireLe} site={donnees.siteDepot} />}
              </div>

              {!expiree && (
                <Carte style={{ padding: 16, marginTop: 16, textAlign: 'left' }}>
                  <p className="etiquette-section" style={{ fontSize: 13, letterSpacing: 0.6, marginBottom: 12 }}>
                    Au comptoir de l’entrepôt
                  </p>
                  <ol className="etapes-depot">
                    <li>
                      <span className="etapes-depot__numero">1</span>
                      <span>Donnez votre code de dépôt au gestionnaire.</span>
                    </li>
                    <li>
                      <span className="etapes-depot__numero">2</span>
                      <span>Il pèse et mesure chaque colis : le format et le prix réel en découlent.</span>
                    </li>
                    <li>
                      <span className="etapes-depot__numero">3</span>
                      <span>Le gestionnaire vous annonce le prix : acceptez-le sur place. Sinon, l’envoi est annulé sans frais.</span>
                    </li>
                    <li>
                      <span className="etapes-depot__numero">4</span>
                      <span>
                        {aLaLivraison
                          ? `${prenom(donnees.destinataireNom)} reçoit par SMS le montant à payer à la livraison et son code de retrait.`
                          : 'Vous payez en espèces ou par Mobile Money (Wave, Orange, MTN).'}
                      </span>
                    </li>
                  </ol>
                </Carte>
              )}

              <Carte style={{ padding: 16, marginTop: 16, textAlign: 'left' }}>
                <div className="rangee" style={{ gap: 8 }}>
                  <span className="etiquette-section extensible" style={{ fontSize: 13, letterSpacing: 0.6 }}>
                    Vos colis
                  </span>
                  <Pastille ton={expiree ? 'neutre' : 'accent'}>{expiree ? 'Expiré' : 'À déposer'}</Pastille>
                </div>

                {donnees.colis.map((colis, i) => (
                  <div key={colis.id} className="rangee" style={{ gap: 12, marginTop: 14 }}>
                    <span className="rond-icone">
                      <IconeBox size={19} />
                    </span>
                    <p className="extensible demi-gras" style={{ fontSize: 14.5 }}>
                      Colis {i + 1}
                      <span className="texte-secondaire" style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>
                        {colis.format ? colis.format.libelle : 'Format fixé au dépôt'}
                      </span>
                    </p>
                    <button type="button" className="code-suivi" onClick={() => copier(colis.codeSuivi, 'Numéro de suivi')} title="Copier le numéro de suivi">
                      {colis.codeSuivi}
                      <Copy size={14} />
                    </button>
                  </div>
                ))}

                <hr className="separateur" style={{ margin: '12px 0' }} />
                <div className="rangee" style={{ gap: 12, fontSize: 14 }}>
                  <span className="extensible texte-secondaire">
                    {aLaLivraison ? 'À payer par le destinataire à la livraison' : 'À payer au dépôt'}
                  </span>
                  <span className="gras">
                    {donnees.montantDefinitif || !donnees.estimation
                      ? prix(donnees.montantTotal)
                      : `${fourchetteLisible(donnees.estimation)}`}
                  </span>
                </div>
                {!donnees.montantDefinitif && (
                  <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 4 }}>
                    Estimation pour {nbColis} colis : le prix réel est fixé au dépôt.
                  </p>
                )}
              </Carte>

              <div style={{ marginTop: 16, textAlign: 'left' }}>
                <EncadreInfo>
                  {phraseReception(donnees.modeReception, donnees.stationArrivee?.nom)} {prenom(donnees.destinataireNom)} reçoit un SMS
                  à chaque étape importante.
                </EncadreInfo>
              </div>
            </div>
          );
        }}
      </VueDonnees>
    </Page>
  );
}
