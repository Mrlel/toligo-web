import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleCheck, House } from 'lucide-react';

import {
  AvatarInitiales,
  BarreEtapes,
  Bouton,
  BoutonAjout,
  Carte,
  Champ,
  EnTete,
  Page,
  PetitBouton,
  PiedDAction,
  useConfirmation,
  useRetour,
} from '../../composants';
import { Routes } from '../../commun/routes';
import { afficher as afficherTelephone } from '../../utils/telephone';
import { listerAdresses } from '../adresses/api';
import { etapesEnvoi, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquette A-Envoi-Adresses (étape 1) : adresse de l'expéditeur et
 * destinataire (un seul par commande, workflow V3.3).
 *
 * L'adresse de l'expéditeur sert à choisir le box de dépôt le plus proche :
 * plus aucun livreur ne vient chercher le colis.
 */
export default function EnvoiAdressesPage() {
  const naviguer = useNavigate();
  const retour = useRetour();
  const confirmer = useConfirmation();
  const { brouillon, choisirCollecte, definirInstructions, reinitialiser } = useEnvoi();
  const { collecte, destinataires } = brouillon;

  // Propose l'adresse par défaut du carnet comme adresse d'expédition.
  useEffect(() => {
    if (collecte) return;
    listerAdresses()
      .then((adresses) => {
        if (adresses.length > 0) choisirCollecte(adresses[0]);
      })
      .catch(() => {
        // Le client choisira lui-même son adresse.
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function quitter() {
    if (destinataires.length > 0) {
      const abandonner = await confirmer({
        titre: 'Abandonner cet envoi ?',
        texte: 'Les informations saisies seront perdues.',
        accepter: 'Abandonner',
        refuser: "Continuer l'envoi",
        danger: true,
      });
      if (!abandonner) return;
    }
    reinitialiser();
    retour();
  }

  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" fermer gris onRetour={quitter} />}
      pied={
        <PiedDAction arrondi>
          <Bouton disabled={!collecte || destinataires.length === 0} onClick={() => naviguer(Routes.envoiColis)}>
            Continuer
          </Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={0} />
      <h2 className="envoi__question">Qui reçoit vos colis ?</h2>
      <p className="envoi__sous-titre">Vérifiez votre adresse, ajoutez le destinataire</p>

      {/* Le trajet : l'expéditeur, puis le destinataire, reliés par un pointillé. */}
      <Carte sansMarge className="trajet-envoi">
        {destinataires.length > 0 && <span className="trajet-envoi__pointille" aria-hidden="true" />}
        <Arret
          rond={
            <span style={{ background: 'var(--encre)', color: 'var(--blanc)' }}>
              <House size={19} />
            </span>
          }
          etiquette="Expéditeur"
          titre={collecte?.libelle ?? 'Votre adresse'}
          lignes={
            collecte
              ? [collecte.adresse, `${collecte.nomContact} · ${afficherTelephone(collecte.telephone)}`]
              : ['Vous déposerez vos colis dans un box Tôligo près de cette adresse.']
          }
          action={collecte ? 'Changer' : 'Choisir'}
          onAction={() => naviguer(Routes.envoiCollecte)}
        />
        {destinataires.map((destinataire, i) => (
          <Arret
            key={destinataire.cle}
            rond={<AvatarInitiales nom={destinataire.nom} rang={i} taille={42} />}
            etiquette="Destinataire"
            titre={destinataire.nom}
            lignes={[destinataire.adresse, `${afficherTelephone(destinataire.telephone)} · ${destinataire.colis.length} colis`]}
            adresseValidee
            action="Modifier"
            onAction={() => naviguer(Routes.modifierDestinataire(i))}
          />
        ))}
      </Carte>

      {/* Un seul destinataire par commande : pour un autre, une autre commande. */}
      {destinataires.length === 0 && (
        <div style={{ marginTop: 10 }}>
          <BoutonAjout onClick={() => naviguer(Routes.envoiDestinataire)}>Ajouter le destinataire</BoutonAjout>
        </div>
      )}

      <div style={{ marginTop: 14 }}>
        <Champ
          libelle="Instructions pour la livraison"
          facultatif
          multiligne
          lignes={2}
          placeholder="Portail bleu, sonner deux fois."
          value={brouillon.instructions}
          onChange={(e) => definirInstructions(e.target.value)}
        />
      </div>
    </Page>
  );
}

/** Un arrêt du trajet : rond, étiquette (« EXPÉDITEUR »), nom, adresse, bouton. */
function Arret({ rond, etiquette, titre, lignes, action, onAction, adresseValidee = false }) {
  return (
    <div className="arret">
      <span className="arret__rond">{rond}</span>
      <div className="extensible">
        <p className="arret__etiquette">{etiquette}</p>
        <p className="arret__titre">{titre}</p>
        {lignes.map((ligne, i) =>
          i === 0 && adresseValidee ? (
            <p key={i} className="arret__ligne rangee" style={{ gap: 5 }}>
              <span className="une-ligne">{ligne}</span>
              <CircleCheck size={14} className="coche-verte" aria-label="Adresse validée" />
            </p>
          ) : (
            <p key={i} className="arret__ligne">
              {ligne}
            </p>
          ),
        )}
      </div>
      <PetitBouton onClick={onAction}>{action}</PetitBouton>
    </div>
  );
}
