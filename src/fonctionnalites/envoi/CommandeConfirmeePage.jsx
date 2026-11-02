import { useNavigate, useParams } from 'react-router-dom';
import { Check, Copy, KeyRound } from 'lucide-react';

import { Bouton, Carte, EncadreInfo, IconeBox, Page, Pastille, PiedDAction, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { jourEtHeure, prenom, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { detailCommande, libelleModeReception } from './api';
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
 * Maquette A-Confirmee : commande confirmée. Pour chaque colis, le box de
 * réception où le déposer et son code à usage unique (CDC V3.3 §10.4).
 *
 * Sans box libre à proximité, le colis attend : Tôligo envoie le code dès
 * qu'un box se libère.
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
          const avecBox = donnees.colis.some((c) => c.box);

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
                {avecBox
                  ? 'Déposez chaque colis dans son box avec le code indiqué. Le code ne sert qu’une fois.'
                  : 'Nous cherchons un box libre près de chez vous et vous envoyons le code dès qu’il est prêt.'}
              </p>

              <Carte style={{ padding: 16, marginTop: 20, textAlign: 'left' }}>
                <div className="rangee" style={{ gap: 8 }}>
                  <span className="etiquette-section extensible" style={{ fontSize: 13, letterSpacing: 0.6 }}>
                    Dépôt de vos colis
                  </span>
                  <Pastille ton="accent">{avecBox ? 'En attente de dépôt' : 'Box en attente'}</Pastille>
                </div>

                {donnees.colis.map((colis, i) => (
                  <div key={colis.id} style={{ marginTop: 14 }}>
                    <div className="rangee" style={{ gap: 12 }}>
                      <span className="rond-icone">
                        <IconeBox size={19} />
                      </span>
                      <div className="extensible">
                        <p className="demi-gras" style={{ fontSize: 14.5 }}>
                          Colis {i + 1} · {colis.format?.libelle ?? ''}
                        </p>
                        <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
                          {colis.box ? [`Box ${colis.box.numero}`, colis.box.adresse].filter(Boolean).join(' · ') : 'Box en cours d’attribution'}
                        </p>
                      </div>
                      <button type="button" className="code-suivi" onClick={() => copier(colis.codeSuivi, 'Numéro de suivi')} title="Copier le numéro de suivi">
                        {colis.codeSuivi}
                        <Copy size={14} />
                      </button>
                    </div>
                    {colis.codeDepot?.code && (
                      <div className="rangee" style={{ gap: 10, marginTop: 8, marginLeft: 52 }}>
                        <KeyRound size={16} aria-hidden="true" />
                        <span className="extensible" style={{ fontSize: 13.5 }}>
                          Code <strong style={{ fontSize: 16, letterSpacing: 1 }}>{colis.codeDepot.code}</strong>
                          {colis.codeDepot.expireLe && (
                            <span className="texte-secondaire"> · avant le {jourEtHeure(colis.codeDepot.expireLe)}</span>
                          )}
                        </span>
                        <button type="button" className="code-suivi" onClick={() => copier(colis.codeDepot.code, 'Code de dépôt')} title="Copier le code de dépôt">
                          <Copy size={14} />
                        </button>
                      </div>
                    )}
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
