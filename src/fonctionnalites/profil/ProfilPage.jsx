import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, Store } from 'lucide-react';

import { AvatarInitiales, Bouton, Chargement, Modale, Page, useConfirmation } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { afficher as afficherTelephone } from '../../utils/telephone';
import { deconnecter } from '../authentification/api';
import './profil.css';

/**
 * Maquette A-Profil, complète.
 *
 * Trois lignes n'ont encore ni écran ni données côté serveur : l'encart
 * « compte commerçant » (phase 2), « Moyens de paiement » (rien n'est
 * enregistré : le paiement passe par la page GeniusPay) et « Conditions
 * générales » (texte à fournir). Elles affichent une explication.
 */
export default function ProfilPage() {
  const naviguer = useNavigate();
  const confirmer = useConfirmation();
  const { profil, fermer } = useSession();
  // Explication affichée dans une fenêtre : { titre, texte }.
  const [explication, setExplication] = useState(null);

  async function seDeconnecter() {
    const ok = await confirmer({
      titre: 'Se déconnecter ?',
      texte: 'Vous devrez saisir à nouveau votre numéro et votre mot de passe.',
      accepter: 'Se déconnecter',
    });
    if (!ok) return;
    await deconnecter();
    fermer();
  }

  return (
    <Page titre="Profil" fond="var(--surface)" largeur="moyenne">
      {!profil ? (
        <Chargement />
      ) : (
        <>
          <div className="profil__entete">
            <AvatarInitiales nom={profil.nomComplet} taille={60} fond="var(--encre)" couleur="var(--blanc)" />
            <div className="extensible">
              <h1 style={{ fontSize: 20 }}>{profil.nomComplet}</h1>
              <p className="rangee" style={{ gap: 6, flexWrap: 'wrap', marginTop: 3, fontSize: 13.5 }}>
                <span className="texte-secondaire">+225 {afficherTelephone(profil.telephone)}</span>
                {profil.telephoneVerifie && (
                  <span className="pastille-verifie">
                    <Check size={12} strokeWidth={3} /> Vérifié
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="encart-commercant"
            style={{ marginTop: 16 }}
            onClick={() =>
              setExplication({
                titre: 'Compte commerçant',
                texte:
                  "Les envois groupés, l'import de commandes et la facturation arrivent bientôt. Votre compte actuel reste utilisable pour tous vos envois.",
              })
            }
          >
            <span className="encart-commercant__icone">
              <Store size={21} />
            </span>
            <span className="extensible">
              <span style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Vous expédiez souvent ?</span>
              <span style={{ display: 'block', fontSize: 13, color: 'var(--gris-sur-noir)', marginTop: 2 }}>
                Passez en compte commerçant : envois groupés, import, facturation.
              </span>
            </span>
            <ChevronRight size={20} />
          </button>

          <div className="profil__colonnes">
            <section>
              <p className="etiquette-section" style={{ fontSize: 13, letterSpacing: 0.6, margin: '0 0 8px 4px' }}>
                Compte
              </p>
              <div className="groupe-profil">
                <Ligne libelle="Informations personnelles" onClick={() => naviguer(Routes.informations)} />
                <Ligne libelle="Mes adresses" valeur={String(profil.nbAdresses)} onClick={() => naviguer(Routes.adresses)} />
                <Ligne
                  libelle="Moyens de paiement"
                  valeur="Mobile money"
                  onClick={() =>
                    setExplication({
                      titre: 'Moyens de paiement',
                      texte:
                        "Vous payez par mobile money (Orange Money, MTN MoMo, Moov Money ou Wave) sur la page sécurisée GeniusPay, au moment de chaque paiement. Aucun moyen de paiement n'est enregistré dans votre compte.",
                    })
                  }
                />
                <Ligne
                  libelle="Paiement à la livraison"
                  valeur={profil.paiementALaLivraison ? 'Disponible' : 'Indisponible'}
                  positive={profil.paiementALaLivraison}
                  onClick={() =>
                    setExplication({
                      titre: 'Paiement à la livraison',
                      texte: profil.paiementALaLivraison
                        ? 'Vous pouvez choisir le paiement à la livraison au moment de commander : chaque destinataire règle son colis à la remise.'
                        : (profil.motifPaiementALaLivraison ?? 'Paiement à la livraison indisponible.'),
                    })
                  }
                />
              </div>
            </section>

            <section>
              <p className="etiquette-section" style={{ fontSize: 13, letterSpacing: 0.6, margin: '0 0 8px 4px' }}>
                Préférences et aide
              </p>
              <div className="groupe-profil">
                <Ligne libelle="Notifications" valeur="SMS et push" onClick={() => naviguer(Routes.notifications)} />
                <Ligne libelle="Centre d'aide" onClick={() => naviguer(Routes.aide)} />
                <Ligne
                  libelle="Conditions générales"
                  onClick={() =>
                    setExplication({
                      titre: 'Conditions générales',
                      texte:
                        "Les conditions générales seront bientôt consultables ici. Pour toute question, contactez-nous depuis le centre d'aide.",
                    })
                  }
                />
              </div>
            </section>
          </div>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button type="button" className="lien lien--erreur" style={{ fontSize: 15, padding: '12px 16px' }} onClick={seDeconnecter}>
              Se déconnecter
            </button>
          </div>
        </>
      )}

      <Modale
        ouverte={explication !== null}
        onFermer={() => setExplication(null)}
        titre={explication?.titre}
        pied={<Bouton onClick={() => setExplication(null)}>Compris</Bouton>}
      >
        <p className="modale__texte">{explication?.texte}</p>
      </Modale>
    </Page>
  );
}

/** Ligne « libellé ........ valeur > ». */
function Ligne({ libelle, valeur, positive = false, onClick }) {
  return (
    <button type="button" className="ligne-profil" onClick={onClick}>
      <span className="extensible">{libelle}</span>
      {valeur && <span className={`ligne-profil__valeur${positive ? ' ligne-profil__valeur--positive' : ''}`}>{valeur}</span>}
      <ChevronRight size={18} color="var(--texte-discret)" />
    </button>
  );
}
