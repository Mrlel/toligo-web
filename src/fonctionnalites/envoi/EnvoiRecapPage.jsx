import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HandCoins, Package, Store, Truck, Warehouse } from 'lucide-react';

import { BarreEtapes, Bouton, Carte, EnTete, Option, Page, PiedDAction, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { distance, prenom, prix } from '../../utils/formatage';
import { libelleModeReception } from './api';
import { fourchetteLisible } from './ColisCommun';
import { etapesEnvoi, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Dernière étape (mise à jour du 26/11/2026) : récapitulatif, estimation du
 * prix, choix du mode de paiement, puis confirmation de l'envoi. Les tarifs
 * indicatifs par format ne sont plus repris ici : seule l'estimation globale
 * reste (la grille est montrée à l'étape « Colis »).
 *
 * Plus de paiement en ligne ni de photo : le prix réel est fixé au comptoir de
 * l'entrepôt, après la pesée et la mesure de chaque colis, et l'expéditeur
 * l'accepte au comptoir. Il paie alors sur place, ou c'est le
 * destinataire qui paie à la livraison.
 *
 * La confirmation émet le code de dépôt (48 h), affiché à l'écran suivant.
 */
export default function EnvoiRecapPage() {
  const naviguer = useNavigate();
  const { profil } = useSession();
  const { afficherErreur } = useMessages();
  const { brouillon, choisirModeReglement, confirmer, reinitialiser } = useEnvoi();
  const [enCours, setEnCours] = useState(false);
  // Vrai une fois la commande confirmée : le brouillon est alors vidé, et
  // l'écran ne doit pas renvoyer au début du parcours pendant qu'on le quitte.
  const termine = useRef(false);

  const commande = brouillon.commande;
  if (!commande) return termine.current ? null : <Navigate to={Routes.envoi} replace />;

  const devis = brouillon.devis;
  const surPlace = brouillon.modeReglement !== 'a_la_livraison';
  const aLaLivraisonPossible = profil?.paiementALaLivraison ?? false;
  const etapes = etapesEnvoi(brouillon);
  const nbColis = devis?.nbColis || commande.nbColisDeclares || commande.colis.length;
  const site = commande.siteDepot ?? brouillon.depot?.site ?? null;

  async function valider() {
    setEnCours(true);
    try {
      const confirmee = await confirmer();
      termine.current = true;
      naviguer(Routes.commandeConfirmee(confirmee.id), { replace: true });
      reinitialiser();
    } catch (erreur) {
      afficherErreur(erreur);
      setEnCours(false);
    }
  }


  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" gris repli={Routes.envoiReception} />}
      pied={
        <PiedDAction arrondi>
          <Bouton enCours={enCours} onClick={valider}>
            Confirmer l’envoi
          </Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapes} courante={etapes.length - 1} />

      <Carte style={{ padding: 16, marginTop: 14 }}>
        <ArretRecap
          repere={<span className="repere-collecte" />}
          etiquette={`Expéditeur · ${brouillon.collecte?.libelle ?? ''}`}
          titre={commande.expediteurNom ?? ''}
          detail={commande.expediteurAdresse ?? ''}
        />
        <ArretRecap
          repere={<span className="repere-livraison" />}
          etiquette="Destinataire"
          titre={commande.destinataireNom}
          detail={commande.livraisonCommune ? `${commande.livraisonCommune}, ${commande.livraisonAdresse}` : commande.livraisonAdresse}
          dernier
        />

        <div className="recap-lignes">
          <LigneRecap icone={Warehouse} libelle="Dépôt" valeur={site ? site.nom : 'Le plus proche'} />
          <LigneRecap icone={Truck} libelle="Remise" valeur={libelleModeReception(commande.modeReception)} />
          <LigneRecap icone={Package} libelle="Colis" valeur={`${nbColis} colis`} />
        </div>
      </Carte>

      <Carte style={{ padding: 16, marginTop: 14 }}>
        {(devis?.montantSupplement ?? 0) > 0 && (
          <div className="rangee" style={{ gap: 10, fontSize: 14, marginBottom: 10 }}>
            <span className="extensible texte-secondaire">
              {libelleModeReception(commande.modeReception)}
              {devis?.distanceKm != null ? ` · ${distance(devis.distanceKm)}` : ''}
            </span>
            <span style={{ fontWeight: 700 }}>+ {prix(devis.montantSupplement)}</span>
          </div>
        )}
        <div className="estimation">
          <h3>Estimation</h3>
          <strong>{devis ? fourchetteLisible(devis.estimation) : '—'}</strong>
        </div>
        <p className="envoi__note" style={{ marginTop: 6 }}>
          Prix final fixé à la pesée, au dépôt.
        </p>
      </Carte>

      <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>Qui paie ?</h2>
      <div className="pile" style={{ gap: 8 }}>
        <OptionReglement
          icone={Store}
          titre="Je paie au dépôt"
          detail="Espèces ou Mobile Money"
          choisie={surPlace}
          onClick={() => choisirModeReglement('sur_place')}
        />
        <OptionReglement
          icone={HandCoins}
          titre="Paiement à la livraison"
          detail={
            aLaLivraisonPossible
              ? `${prenom(commande.destinataireNom)} paie à la remise`
              : (profil?.motifPaiementALaLivraison ?? 'Indisponible pour votre compte')
          }
          choisie={!surPlace}
          desactivee={!aLaLivraisonPossible}
          onClick={() => choisirModeReglement('a_la_livraison')}
        />
      </div>
      {!surPlace && <p className="envoi__note">Après 2 refus de payer, le colis vous revient (frais de retour à votre charge).</p>}
    </Page>
  );
}

/** Ligne du récapitulatif : icône, libellé, valeur. */
function LigneRecap({ icone: Icone, libelle, valeur }) {
  return (
    <div className="recap-ligne">
      <Icone size={18} aria-hidden="true" />
      <span className="recap-ligne__libelle">{libelle}</span>
      <span className="recap-ligne__valeur une-ligne">{valeur}</span>
    </div>
  );
}

/** Un arrêt du récapitulatif, relié au suivant par un pointillé. */
function ArretRecap({ repere, etiquette, titre, detail, dernier }) {
  return (
    <div className={`arret-recap${dernier ? ' arret-recap--dernier' : ''}`}>
      <span className="arret-recap__repere">{repere}</span>
      <div className="arret-recap__contenu">
        <div className="extensible">
          <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
            {etiquette}
          </p>
          <p className="demi-gras" style={{ fontSize: 14.5 }}>
            {titre}
          </p>
          <p className="texte-secondaire une-ligne" style={{ fontSize: 12.5 }}>
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Option « Je paie au dépôt » / « Paiement à la livraison ». */
function OptionReglement({ icone: Icone, titre, detail, choisie, desactivee = false, onClick }) {
  return (
    <Option choisie={choisie} desactivee={desactivee} onClick={onClick}>
      <div className="rangee" style={{ gap: 12 }}>
        <span className={`rond-icone${choisie ? ' rond-icone--noir' : ''}`}>
          <Icone size={19} />
        </span>
        <div className="extensible">
          <p className="demi-gras" style={{ fontSize: 15 }}>
            {titre}
          </p>
          <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2, lineHeight: 1.35 }}>
            {detail}
          </p>
        </div>
      </div>
    </Option>
  );
}
