import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { HandCoins, Scale, Store, Warehouse } from 'lucide-react';

import { BarreEtapes, Bouton, Carte, EncadreInfo, EnTete, Option, Page, PiedDAction, useMessages } from '../../composants';
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

  const station = devis?.stationArrivee;
  const detailReception = [
    libelleModeReception(commande.modeReception),
    station ? station.nom : null,
    devis?.distanceKm != null ? `${distance(devis.distanceKm)} de la station` : null,
  ]
    .filter(Boolean)
    .join(' · ');

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

        <p className="texte-secondaire" style={{ fontSize: 12.5, margin: '4px 0 0' }}>
          {detailReception}
        </p>

        <div className="encadre-info" style={{ fontSize: 12.5, marginTop: 12 }}>
          <Warehouse size={18} aria-hidden="true" />
          <span>
            {site
              ? `Dépôt à ${site.nom}${site.adresse ? ` (${site.adresse})` : ''}.`
              : 'Dépôt dans l’entrepôt Tôligo le plus proche de chez vous, indiqué à la confirmation.'}
          </span>
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
          <h3>
            Estimation
            <span className="texte-secondaire" style={{ display: 'block', fontSize: 12.5, fontWeight: 500 }}>
              {nbColis} colis{(devis?.montantSupplement ?? 0) > 0 ? ', supplément compris' : ''}
            </span>
          </h3>
          <strong>{devis ? fourchetteLisible(devis.estimation) : '—'}</strong>
        </div>
        <div style={{ marginTop: 12 }}>
          <EncadreInfo icone={Scale}>
            Le prix réel est fixé au dépôt, d’après le poids et les dimensions de chaque colis. Vous l’acceptez sur place ; s’il ne
            vous convient pas, l’envoi est annulé sans frais.
          </EncadreInfo>
        </div>
      </Carte>

      <h2 style={{ fontSize: 16, margin: '18px 0 10px' }}>Qui paie l’envoi ?</h2>
      <div className="pile" style={{ gap: 8 }}>
        <OptionReglement
          icone={Store}
          titre="Je paie au dépôt"
          detail="En espèces ou par Mobile Money (Wave, Orange, MTN), une fois le prix réel accepté"
          choisie={surPlace}
          onClick={() => choisirModeReglement('sur_place')}
        />
        <OptionReglement
          icone={HandCoins}
          titre="Paiement à la livraison"
          detail={
            aLaLivraisonPossible
              ? `${prenom(commande.destinataireNom)} paie à la remise. Le montant lui est envoyé par SMS dès le dépôt.`
              : (profil?.motifPaiementALaLivraison ?? 'Indisponible pour votre compte')
          }
          choisie={!surPlace}
          desactivee={!aLaLivraisonPossible}
          onClick={() => choisirModeReglement('a_la_livraison')}
        />
      </div>
      {!surPlace && (
        <div style={{ marginTop: 10 }}>
          <EncadreInfo>
            Si le destinataire refuse deux fois de payer, le colis vous est retourné et les frais de retour sont à votre charge.
          </EncadreInfo>
        </div>
      )}
    </Page>
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
