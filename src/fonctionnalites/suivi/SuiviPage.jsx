import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Marker } from 'react-leaflet';
import { BellRing, Camera, Check, CreditCard, KeyRound, Share2, TriangleAlert } from 'lucide-react';

import {
  Bouton,
  BoutonRond,
  EncadreInfo,
  EnTete,
  Modale,
  Option,
  Page,
  Pastille,
  useConfirmation,
  useMessages,
  useRetour,
  VueDonnees,
} from '../../composants';
import { ABIDJAN, AjustementTaille, Cadrage, CarteOsm, iconeRepere } from '../../commun/carte';
import { listerFormats, poidsLisible } from '../../commun/formats';
import { Routes } from '../../commun/routes';
import { distance, heure, jourEtHeure, moment, prenom, prix } from '../../utils/formatage';
import { lireDate } from '../../utils/lecture';
import { useDonnees } from '../../utils/useDonnees';
import { libelleModeReception } from '../envoi/api';
import { VignetteFormat } from '../envoi/ColisCommun';
import { AttentePaiement, fermerOnglet, ouvrirPagePaiement, preparerOngletPaiement } from '../paiement/paiement';
import { changerFormatColis, demanderNouveauBox, detailColis, libelleStatutColis, payerComplement, positionColis } from './api';
import './suivi.css';

/** Toutes les 20 secondes : l'hébergement actuel ne permet pas le temps réel (WebSocket). */
const INTERVALLE_POSITION = 20000;

/**
 * Maquette A-Suivi : carte, frise des étapes et paiement d'un colis.
 *
 * Sur téléphone, la carte est en haut et le panneau blanc glisse par-dessus ;
 * sur ordinateur, la carte occupe la gauche et le panneau la droite.
 */
export default function SuiviPage() {
  const { code } = useParams();
  const colis = useDonnees(() => detailColis(code), [code]);

  useEffect(() => {
    document.title = `Colis ${code} · Tôligo`;
  });

  // Chargement ou erreur (numéro inconnu...) : écran simple avec un retour.
  if (colis.donnees === undefined) {
    return (
      <Page titre={`Colis ${code}`} entete={<EnTete titre={`Colis ${code}`} repli={Routes.envois} />}>
        <VueDonnees etat={colis}>{() => null}</VueDonnees>
      </Page>
    );
  }
  return <Suivi colis={colis.donnees} onActualiser={colis.recharger} />;
}

function Suivi({ colis, onActualiser }) {
  const naviguer = useNavigate();
  const retour = useRetour(Routes.envois);
  const { afficherMessage } = useMessages();
  const [position, setPosition] = useState(null);

  // Position du livreur, relue régulièrement pendant le trajet.
  useEffect(() => {
    if (!colis.suiviPosition) return undefined;
    let actif = true;
    const lire = () =>
      positionColis(colis.codeSuivi)
        .then((p) => actif && setPosition(p))
        .catch(() => {
          // Position indisponible : la carte montre seulement les adresses.
        });
    lire();
    const minuteur = setInterval(lire, INTERVALLE_POSITION);
    return () => {
      actif = false;
      clearInterval(minuteur);
    };
  }, [colis.codeSuivi, colis.suiviPosition]);

  async function partager() {
    const lien = colis.lienSuivi;
    if (!lien) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Colis ${colis.codeSuivi}`, url: lien });
        return;
      } catch {
        // Partage annulé : on copie le lien à la place.
      }
    }
    try {
      await navigator.clipboard.writeText(lien);
      afficherMessage(`Lien de suivi copié : collez-le dans un message à ${prenom(colis.destinataireNom)}.`);
    } catch {
      afficherMessage(lien);
    }
  }

  return (
    <div className="suivi">
      <div className="suivi__carte">
        <CarteSuivi colis={colis} position={position} />
        <div className="suivi__boutons">
          <BoutonRond apparence="flottant" onClick={retour} />
          {colis.suiviPosition ? (
            <span className="pastille-position">
              <span className={`pastille-position__point${position ? ' pastille-position__point--direct' : ''}`} />
              {position ? 'Position en direct' : 'Position bientôt disponible'}
            </span>
          ) : (
            <span style={{ flex: 1 }} />
          )}
          {colis.lienSuivi ? (
            <BoutonRond apparence="flottant" icone={Share2} libelle="Partager le suivi" taille={20} onClick={partager} />
          ) : (
            <span style={{ width: 44 }} />
          )}
        </div>
      </div>

      <section className="suivi__panneau">
        <div className="suivi__poignee" />
        <div className="rangee" style={{ gap: 8 }}>
          <p className="extensible texte-secondaire" style={{ fontSize: 13, fontWeight: 500 }}>
            Colis {colis.codeSuivi}
            {colis.format ? ` · Format ${colis.format.libelle}` : ''}
          </p>
          {colis.modeReception && <Pastille>{libelleModeReception(colis.modeReception)}</Pastille>}
        </div>
        <h1 className="suivi__titre">{titreSuivi(colis)}</h1>
        {colis.stationDepart && colis.stationArrivee && colis.distanceStationsKm !== null && (
          <p className="texte-secondaire" style={{ fontSize: 13.5, marginTop: 4 }}>
            {colis.stationDepart ?? ''} → {colis.stationArrivee ?? ''} · {distance(colis.distanceStationsKm)} à vol d'oiseau
          </p>
        )}
        <hr className="separateur" style={{ margin: '14px 0' }} />

        <ActionRequise colis={colis} onActualiser={onActualiser} />
        <Frise colis={colis} />
        <BlocPaiement colis={colis} />

        <div className="pile" style={{ gap: 4, marginTop: 12 }}>
          {colis.estLivre && (
            <Bouton onClick={() => naviguer(Routes.colisLivre(colis.codeSuivi))}>
              {colis.note === null ? 'Donner mon avis' : 'Voir la livraison'}
            </Bouton>
          )}
          <Bouton variante="texte" icone={TriangleAlert} onClick={() => naviguer(Routes.incident(colis.codeSuivi))}>
            Un problème avec ce colis ?
          </Bouton>
          <Bouton variante="texte" onClick={onActualiser}>
            Actualiser
          </Bouton>
        </div>
      </section>
    </div>
  );
}

/** Titre du suivi : l'étape en cours, sinon la dernière étape faite. */
function titreSuivi(colis) {
  const enCours = colis.jalons.find((j) => j.etat === 'en_cours');
  if (enCours) return enCours.libelle;
  const faits = colis.jalons.filter((j) => j.etat === 'fait');
  return faits.length === 0 ? libelleStatutColis(colis.statut) : faits[faits.length - 1].libelle;
}

/** Carte : expéditeur, destinataire et, pendant la livraison à domicile, le livreur. */
function CarteSuivi({ colis, position }) {
  const reperes = [];
  if (colis.expediteurLatitude !== null && colis.expediteurLongitude !== null) {
    reperes.push({ cle: 'expediteur', point: [colis.expediteurLatitude, colis.expediteurLongitude], icone: iconeRepere('point', '#121212') });
  }
  if (colis.livraisonLatitude !== null && colis.livraisonLongitude !== null) {
    reperes.push({ cle: 'livraison', point: [colis.livraisonLatitude, colis.livraisonLongitude], icone: iconeRepere('drapeau', '#C94A0A') });
  }
  if (position) {
    reperes.push({ cle: 'livreur', point: [position.latitude, position.longitude], icone: iconeRepere('livreur', '#0E7A52') });
  }
  const points = reperes.map((r) => r.point);

  return (
    <CarteOsm centre={points[points.length - 1] ?? ABIDJAN} zoom={13}>
      <AjustementTaille />
      <Cadrage points={points} marge={60} />
      {reperes.map((r) => (
        <Marker key={r.cle} position={r.point} icon={r.icone} />
      ))}
    </CarteOsm>
  );
}

/**
 * Ce que le client doit faire : déposer son colis dans le box avec son code,
 * demander un nouveau box, payer la commande ou un complément de prix.
 *
 * Avant le dépôt, le client peut aussi changer le format d'un colis qui ne
 * tient pas dans son box, ou demander un autre box si le sien est
 * inutilisable (CDC V3.3 §21.9) : un autre box et un nouveau code lui sont
 * alors attribués.
 */
function ActionRequise({ colis, onActualiser }) {
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const confirmer = useConfirmation();
  const [enCours, setEnCours] = useState(false);
  const [choixFormat, setChoixFormat] = useState(false);
  // Vrai une fois la page GeniusPay du complément ouverte.
  const [attentePaiement, setAttentePaiement] = useState(false);
  const code = colis.codeSuivi;

  /** Le complément est payé dès que le suivi ne le demande plus. */
  const complementPaye = useCallback(async () => {
    try {
      return (await detailColis(code)).action?.type !== 'complement';
    } catch {
      return false;
    }
  }, [code]);

  const surComplementPaye = useCallback(() => {
    setAttentePaiement(false);
    afficherMessage('Complément payé. Merci !');
    onActualiser();
  }, [afficherMessage, onActualiser]);

  const action = colis.action;
  if (!action) return null;

  async function nouveauBox(apresExpiration) {
    if (!apresExpiration) {
      const ok = await confirmer({
        titre: 'Demander un autre box ?',
        texte: 'Le box actuel et son code ne serviront plus. Tôligo vous attribue un autre box proche, avec un nouveau code.',
        accepter: 'Demander un autre box',
      });
      if (!ok) return;
    }
    setEnCours(true);
    try {
      const resultat = await demanderNouveauBox(code);
      afficherMessage(`Nouveau box ${resultat.boxNumero ?? ''} : déposez le colis avec le code ${resultat.code ?? ''}.`);
      onActualiser();
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  async function payer() {
    // L'onglet de paiement s'ouvre dans le clic, sinon le navigateur le bloque.
    const onglet = preparerOngletPaiement();
    setEnCours(true);
    try {
      const paiement = await payerComplement(code);
      if (!ouvrirPagePaiement(paiement.checkoutUrl, onglet)) {
        afficherMessage("Impossible d'ouvrir la page de paiement. Autorisez les fenêtres pop-up pour ce site.");
      }
      setAttentePaiement(true);
    } catch (erreur) {
      fermerOnglet(onglet);
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  if (action.type === 'depot_box') {
    return (
      <div style={{ marginBottom: 16 }}>
        <EncadreInfo accent icone={KeyRound}>
          Déposez le colis dans le box <strong>{action.box}</strong>
          {colis.box?.adresse ? ` (${colis.box.adresse})` : ''} avec le code <strong>{action.code}</strong>
          {action.expireLe ? `, avant le ${jourEtHeure(action.expireLe)}` : ''}. Le code ne sert qu'une fois.
        </EncadreInfo>
        <div className="actions-depot">
          <Bouton variante="texte" compact onClick={() => setChoixFormat(true)}>
            Le colis ne tient pas dans le box
          </Bouton>
          <Bouton variante="texte" compact enCours={enCours} onClick={() => nouveauBox(false)}>
            Le box est inutilisable
          </Bouton>
        </div>
        <ChoixFormat
          colis={colis}
          ouverte={choixFormat}
          onFermer={() => setChoixFormat(false)}
          onChange={() => {
            setChoixFormat(false);
            onActualiser();
          }}
        />
      </div>
    );
  }

  if (action.type === 'nouveau_box') {
    return (
      <div className="pile" style={{ gap: 8, marginBottom: 16 }}>
        <EncadreInfo accent icone={BellRing}>
          La réservation du box a expiré sans dépôt. Demandez un nouveau box : Tôligo vous en attribue un autre, proche,
          avec un nouveau code.
        </EncadreInfo>
        <Bouton variante="accent" enCours={enCours} onClick={() => nouveauBox(true)}>
          Obtenir un nouveau box
        </Bouton>
      </div>
    );
  }

  if (action.type === 'complement') {
    const montant = prix(action.montant ?? 0);
    return (
      <div className="pile" style={{ gap: 8, marginBottom: 16 }}>
        <EncadreInfo accent icone={CreditCard}>
          Le format du colis a changé : un complément de <strong>{montant}</strong> reste à payer.
        </EncadreInfo>
        {attentePaiement ? (
          <AttentePaiement estPaye={complementPaye} onPaye={surComplementPaye} onRelancer={payer} />
        ) : (
          <Bouton variante="accent" enCours={enCours} onClick={payer}>
            Payer {montant}
          </Bouton>
        )}
      </div>
    );
  }

  if (action.type !== 'paiement' || !action.commandeId) return null;

  return (
    <div className="pile" style={{ gap: 8, marginBottom: 16 }}>
      <EncadreInfo accent icone={BellRing}>
        Paiement en attente : votre box de dépôt vous est attribué dès qu'il est confirmé.
      </EncadreInfo>
      <Bouton variante="accent" onClick={() => naviguer(Routes.paiementCommande(action.commandeId))}>
        Payer maintenant
      </Bouton>
    </div>
  );
}

/**
 * Fenêtre « Changer de format » (D11) : le colis ne tient pas dans son box.
 * Le serveur recalcule le prix et attribue un box qui accepte ce format.
 */
function ChoixFormat({ colis, ouverte, onFermer, onChange }) {
  const { afficherMessage, afficherErreur } = useMessages();
  const formats = useDonnees(listerFormats, []);
  const [choisi, setChoisi] = useState(null);
  const [enCours, setEnCours] = useState(false);

  async function valider() {
    if (!choisi) return;
    setEnCours(true);
    try {
      const resultat = await changerFormatColis(colis.codeSuivi, choisi.id);
      const phrases = [`Format ${choisi.libelle} enregistré.`];
      if (resultat.code) phrases.push(`Nouveau box ${resultat.boxNumero ?? ''} : code ${resultat.code}.`);
      if (resultat.complement) phrases.push(`Complément à payer : ${prix(resultat.complement)}.`);
      else if (resultat.remboursement) phrases.push(`Remboursement de ${prix(resultat.remboursement)} en cours de validation.`);
      afficherMessage(phrases.join(' '));
      setChoisi(null);
      onChange();
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre="Changer de format"
      pied={
        <Bouton enCours={enCours} disabled={!choisi} onClick={valider}>
          Valider le format
        </Bouton>
      }
    >
      <p className="modale__texte">
        Choisissez le format qui correspond au colis. Le prix est recalculé, et un box qui accepte ce format vous est attribué,
        avec un nouveau code.
      </p>
      <VueDonnees etat={formats}>
        {(liste) => (
          <div className="pile" style={{ gap: 8, marginTop: 14 }}>
            {liste.map((format) => {
              const actuel = format.code === colis.format?.code;
              return (
                <Option
                  key={format.id}
                  choisie={choisi?.id === format.id}
                  desactivee={actuel}
                  onClick={() => setChoisi(format)}
                  style={{ padding: '10px 14px 10px 10px' }}
                >
                  <div className="rangee" style={{ gap: 14 }}>
                    <VignetteFormat format={format} />
                    <div className="extensible">
                      <p className="titre" style={{ fontSize: 15.5 }}>
                        {format.libelle}
                      </p>
                      <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                        {actuel ? 'Format actuel' : poidsLisible(format.poidsMaxKg)}
                      </p>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>{prix(format.prix)}</span>
                  </div>
                </Option>
              );
            })}
          </div>
        )}
      </VueDonnees>
    </Modale>
  );
}

/** Frise verticale des jalons. */
function Frise({ colis }) {
  const { jalons } = colis;
  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {jalons.map((jalon, i) => {
        const fait = jalon.etat === 'fait';
        const enCours = jalon.etat === 'en_cours';
        return (
          <li className="frise__jalon" key={`${jalon.code}-${i}`}>
            <div className="frise__colonne">
              <span className={`frise__puce${fait ? ' frise__puce--fait' : ''}${enCours ? ' frise__puce--en-cours' : ''}`}>
                {fait && <Check size={14} strokeWidth={3} />}
              </span>
              {i < jalons.length - 1 && <span className={`frise__trait${fait ? ' frise__trait--fait' : ''}`} />}
            </div>
            <div className="frise__texte">
              <p className="frise__libelle">
                <span
                  style={{
                    fontWeight: enCours ? 700 : fait ? 600 : 400,
                    color: enCours ? 'var(--accent-fonce)' : fait ? 'var(--encre)' : 'var(--texte-secondaire)',
                  }}
                >
                  {jalon.libelle}
                </span>
                {jalon.survenuLe && (
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: enCours ? 600 : 400,
                      color: enCours ? 'var(--accent-fonce)' : 'var(--texte-secondaire)',
                    }}
                  >
                    {enCours ? `depuis ${heure(jalon.survenuLe)}` : heure(jalon.survenuLe)}
                  </span>
                )}
              </p>
              {jalon.detail && (
                <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
                  {jalon.detail}
                </p>
              )}
              {jalon.preuveDisponible && (
                <Link className="lien-preuve" to={Routes.preuves(colis.codeSuivi)}>
                  <Camera size={14} />
                  {jalon.code === 'remise' ? 'Voir la preuve de remise' : 'Voir les preuves'}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/** Bloc « Payé en ligne · Orange Money · aujourd'hui à 12:58 ». */
function BlocPaiement({ colis }) {
  const { statut } = colis.paiement;
  const payeLe = lireDate(colis.paiement.paye_le);
  let titre = 'Paiement en attente';
  let detail = 'Mobile money';
  if (statut === 'paye' && colis.modeReglement === 'a_la_livraison') {
    titre = 'Payé à la livraison';
    detail = moment(payeLe);
  } else if (statut === 'paye') {
    titre = 'Payé en ligne';
    detail = moment(payeLe);
  } else if (statut === 'a_la_livraison') {
    titre = 'Paiement à la livraison';
    detail = 'Le destinataire règle avant la remise';
  }

  return (
    <div className="bloc-paiement">
      <span className="vignette" style={{ width: 40, height: 40, background: 'var(--blanc)' }}>
        <CreditCard size={20} />
      </span>
      <div className="extensible">
        <p className="demi-gras" style={{ fontSize: 14 }}>
          {titre}
        </p>
        {detail && (
          <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
            {detail}
          </p>
        )}
      </div>
      <span className="titre" style={{ fontSize: 16 }}>
        {prix(colis.prix)}
      </span>
    </div>
  );
}
