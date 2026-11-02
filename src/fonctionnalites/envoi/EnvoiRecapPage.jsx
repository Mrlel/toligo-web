import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Banknote, Camera, Check, Smartphone } from 'lucide-react';

import { BarreEtapes, Bouton, Carte, EncadreInfo, EnTete, IconeBox, Option, Page, PiedDAction, Roue, useMessages } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { distance, prix } from '../../utils/formatage';
import { preparerPhoto } from '../../utils/photo';
import { fermerOnglet, ouvrirPagePaiement, preparerOngletPaiement } from '../paiement/paiement';
import { ImageProtegee } from '../suivi/ImageProtegee';
import { adressePhotoColis, envoyerPhotoColis, libelleModeReception, payerCommande } from './api';
import { etapesEnvoi, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquette A-Envoi-Recap (dernière étape) : récapitulatif, photo de chaque
 * colis, choix de qui paie, puis confirmation de la commande.
 *
 * Le devis vient du serveur : station d'arrivée choisie par Tôligo, prix des
 * formats et supplément du mode de réception.
 *
 * Écart avec la maquette : la vignette de chaque colis devient sa photo. Le
 * serveur exige une photo par colis avant la confirmation (CDC V3.3 §11.2) ;
 * elle part dès qu'elle est choisie, sur le colis du brouillon.
 *
 * « Payer » confirme la commande puis ouvre directement la page GeniusPay
 * dans un nouvel onglet ; l'écran Paiement attend ensuite la confirmation.
 */
export default function EnvoiRecapPage() {
  const naviguer = useNavigate();
  const { profil } = useSession();
  const { afficherMessage, afficherErreur } = useMessages();
  const { brouillon, choisirModeReglement, confirmer, marquerPhoto, reinitialiser } = useEnvoi();
  const [enCours, setEnCours] = useState(false);
  // Photos envoyées depuis cet écran : aperçu local, par numéro de suivi.
  const [apercus, setApercus] = useState({});
  const [envoisPhoto, setEnvoisPhoto] = useState({});
  const apercusActuels = useRef(apercus);
  apercusActuels.current = apercus;
  // Vrai une fois la commande confirmée : le brouillon est alors vidé, et
  // l'écran ne doit pas renvoyer au début du parcours pendant qu'on le quitte.
  const termine = useRef(false);

  // Les aperçus sont libérés de la mémoire quand on quitte l'écran.
  useEffect(() => () => Object.values(apercusActuels.current).forEach((adresse) => URL.revokeObjectURL(adresse)), []);

  const commande = brouillon.commande;
  if (!commande) return termine.current ? null : <Navigate to={Routes.envoi} replace />;

  const devis = brouillon.devis;
  const total = devis?.montantTotal ?? commande.montantTotal;
  const enLigne = brouillon.modeReglement === 'en_ligne';
  const aLaLivraisonPossible = profil?.paiementALaLivraison ?? false;
  const etapes = etapesEnvoi(brouillon);
  const photosManquantes = commande.colis.filter((c) => !c.aUnePhoto).length;

  async function choisirPhoto(colis, fichier) {
    if (!fichier) return;
    const code = colis.codeSuivi;
    setEnvoisPhoto((e) => ({ ...e, [code]: true }));
    try {
      const photo = await preparerPhoto(fichier);
      await envoyerPhotoColis(code, photo);
      if (apercusActuels.current[code]) URL.revokeObjectURL(apercusActuels.current[code]);
      const adresse = URL.createObjectURL(photo);
      setApercus((a) => ({ ...a, [code]: adresse }));
      marquerPhoto(code);
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setEnvoisPhoto((e) => ({ ...e, [code]: false }));
    }
  }

  async function valider() {
    if (photosManquantes > 0) {
      afficherMessage('Ajoutez la photo de chaque colis avant de confirmer.');
      return;
    }
    // L'onglet de paiement s'ouvre dans le clic, sinon le navigateur le bloque.
    const onglet = enLigne ? preparerOngletPaiement() : null;
    setEnCours(true);
    try {
      const confirmee = await confirmer();

      // Un prix a pu changer depuis le devis : on prévient.
      if (confirmee.montantTotal !== total) afficherMessage(`Montant mis à jour : ${prix(confirmee.montantTotal)}.`);

      if (confirmee.modeReglement === 'en_ligne') {
        let paiement = null;
        try {
          paiement = await payerCommande(confirmee.id);
          if (!ouvrirPagePaiement(paiement.checkoutUrl, onglet)) {
            afficherMessage("Impossible d'ouvrir la page de paiement. Autorisez les fenêtres pop-up pour ce site.");
          }
        } catch (erreur) {
          // La commande est confirmée : le paiement pourra être relancé depuis l'écran Paiement.
          fermerOnglet(onglet);
          afficherErreur(erreur);
        }
        naviguer(Routes.paiementCommande(confirmee.id), { replace: true, state: { paiement } });
      } else {
        naviguer(Routes.commandeConfirmee(confirmee.id), { replace: true });
      }
      termine.current = true;
      reinitialiser();
    } catch (erreur) {
      fermerOnglet(onglet);
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
          <Bouton variante={enLigne ? 'accent' : 'principal'} enCours={enCours} onClick={valider}>
            {enLigne ? `Payer ${prix(total)}` : 'Confirmer la commande'}
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

        <p className="texte-secondaire" style={{ fontSize: 12.5, margin: '4px 0 10px' }}>
          {detailReception}
        </p>

        {commande.colis.map((colis, i) => (
          <div key={colis.id} className="rangee" style={{ gap: 10, marginTop: 10 }}>
            <PhotoColis
              colis={colis}
              rang={i + 1}
              apercu={apercus[colis.codeSuivi]}
              enCours={envoisPhoto[colis.codeSuivi] ?? false}
              onChoisir={(fichier) => choisirPhoto(colis, fichier)}
            />
            <span className="extensible">
              <span className="demi-gras" style={{ display: 'block', fontSize: 14 }}>
                Colis {i + 1} · {colis.format?.libelle ?? ''}
              </span>
              <span className="texte-secondaire une-ligne" style={{ display: 'block', fontSize: 12.5 }}>
                {colis.description}
              </span>
              <span className={`photo-colis__etat${colis.aUnePhoto ? ' photo-colis__etat--faite' : ''}`}>
                {colis.aUnePhoto ? 'Photo ajoutée' : 'Photo à ajouter'}
              </span>
            </span>
            <span style={{ fontSize: 14, fontWeight: 700 }}>{prix(colis.prix)}</span>
          </div>
        ))}

        {photosManquantes > 0 && (
          <div style={{ marginTop: 12 }}>
            <EncadreInfo accent icone={Camera}>
              Prenez chaque colis en photo : la station s'en sert pour le reconnaître, et elle sert de preuve en cas de litige.
            </EncadreInfo>
          </div>
        )}

        {(devis?.montantSupplement ?? 0) > 0 && (
          <div className="rangee" style={{ gap: 10, marginTop: 10, fontSize: 14 }}>
            <span className="extensible texte-secondaire">{libelleModeReception(commande.modeReception)}</span>
            <span style={{ fontWeight: 700 }}>{prix(devis.montantSupplement)}</span>
          </div>
        )}

        <div className="encadre-info" style={{ fontSize: 12.5, marginTop: 12 }}>
          <IconeBox size={18} />
          <span>Après la confirmation, vous recevez un box Tôligo près de chez vous et un code pour y déposer vos colis.</span>
        </div>

        <div className="total" style={{ marginTop: 14 }}>
          <h3>Total · {commande.colis.length} colis</h3>
          <strong>{prix(total)}</strong>
        </div>
      </Carte>

      <h2 style={{ fontSize: 16, margin: '14px 0 10px' }}>Qui paie la livraison ?</h2>
      <div className="pile" style={{ gap: 8 }}>
        <OptionReglement
          icone={Smartphone}
          titre="Je paie maintenant"
          detail={`Mobile money · ${prix(total)}`}
          choisie={enLigne}
          onClick={() => choisirModeReglement('en_ligne')}
        />
        <OptionReglement
          icone={Banknote}
          titre="Paiement à la livraison"
          detail={
            aLaLivraisonPossible
              ? 'Le destinataire règle la commande avant la remise'
              : (profil?.motifPaiementALaLivraison ?? 'Indisponible pour votre compte')
          }
          choisie={!enLigne}
          desactivee={!aLaLivraisonPossible}
          onClick={() => choisirModeReglement('a_la_livraison')}
        />
      </div>
      {!enLigne && (
        <div style={{ marginTop: 10 }}>
          <EncadreInfo>En cas de refus de payer, le colis vous est retourné et la livraison comme le retour restent à votre charge.</EncadreInfo>
        </div>
      )}
    </Page>
  );
}

/** Un arrêt du récapitulatif, relié au suivant par un pointillé. */
function ArretRecap({ repere, etiquette, titre, detail, fin, dernier }) {
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
        {fin}
      </div>
    </div>
  );
}

/**
 * Vignette d'un colis : sa photo, ou un appareil photo tant qu'elle manque.
 * Un nouveau choix remplace la photo, jusqu'à la confirmation.
 */
function PhotoColis({ colis, rang, apercu, enCours, onChoisir }) {
  let contenu = <Camera size={20} />;
  if (enCours) contenu = <Roue />;
  else if (apercu) contenu = <img src={apercu} alt={`Photo du colis ${rang}`} />;
  else if (colis.aUnePhoto) contenu = <ImageProtegee url={adressePhotoColis(colis.codeSuivi)} hauteur={52} alt={`Photo du colis ${rang}`} />;

  return (
    <label
      className={`photo-colis${colis.aUnePhoto ? ' photo-colis--faite' : ''}`}
      title={colis.aUnePhoto ? 'Changer la photo' : 'Ajouter la photo du colis'}
    >
      {contenu}
      {colis.aUnePhoto && !enCours && (
        <span className="photo-colis__coche">
          <Check size={11} strokeWidth={3} />
        </span>
      )}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="invisible"
        disabled={enCours}
        aria-label={colis.aUnePhoto ? `Changer la photo du colis ${rang}` : `Ajouter la photo du colis ${rang}`}
        onChange={(e) => {
          onChoisir(e.target.files?.[0] ?? null);
          e.target.value = '';
        }}
      />
    </label>
  );
}

/** Option « Je paie maintenant » / « Paiement à la livraison ». */
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
