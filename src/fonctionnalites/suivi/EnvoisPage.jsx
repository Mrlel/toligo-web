import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus } from 'lucide-react';

import {
  BlocGris,
  Bouton,
  BoutonRond,
  Carte,
  Cascade,
  OngletsSegmentes,
  Page,
  Pastille,
  ProgressionSegmentee,
  TitreEcran,
  VueDonnees,
  VueVide,
} from '../../composants';
import { Routes } from '../../commun/routes';
import { moment, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { libelleStatutColis, listerEnvois, tonStatutColis } from './api';
import './suivi.css';

const ONGLETS = [
  { cle: 'en_cours', libelle: 'En cours' },
  { cle: 'termines', libelle: 'Terminés' },
  { cle: 'annules', libelle: 'Annulés' },
];

/** Nombre de « terminés récemment » rappelés sous les envois en cours. */
const NB_TERMINES_RECENTS = 3;

/** Ouvre l'écran adapté à un colis : paiement, livré ou suivi (le suivi affiche le code de dépôt). */
export function ouvrirColis(naviguer, colis) {
  const action = colis.action?.type;
  if (action === 'paiement' && colis.action.commandeId) naviguer(Routes.paiementCommande(colis.action.commandeId));
  else if (colis.statut === 'livre') naviguer(Routes.colisLivre(colis.codeSuivi));
  else naviguer(Routes.colis(colis.codeSuivi));
}

/**
 * Maquette A-Envois : mes envois, par onglet (en cours, terminés, annulés).
 * L'onglet « En cours » rappelle aussi les derniers envois terminés.
 */
export default function EnvoisPage() {
  const naviguer = useNavigate();
  const [onglet, setOnglet] = useState('en_cours');
  const page = useDonnees(() => listerEnvois(onglet), [onglet]);
  const termines = useDonnees(() => (onglet === 'en_cours' ? listerEnvois('termines') : Promise.resolve(null)), [onglet]);

  const compteurs = page.donnees?.compteurs ?? {};
  const recents = onglet === 'en_cours' ? (termines.donnees?.colis ?? []).slice(0, NB_TERMINES_RECENTS) : [];

  return (
    <Page titre="Mes envois" largeur="moyenne">
      <TitreEcran
        action={<BoutonRond icone={Plus} libelle="Nouvel envoi" apparence="noir" onClick={() => naviguer(Routes.envoi)} />}
      >
        Mes envois
      </TitreEcran>

      <OngletsSegmentes
        onglets={ONGLETS.map((o) => ({
          cle: o.cle,
          libelle: o.cle === 'en_cours' && compteurs.en_cours > 0 ? `${o.libelle} · ${compteurs.en_cours}` : o.libelle,
        }))}
        courant={onglet}
        onChoisir={setOnglet}
      />

      <div style={{ marginTop: 16 }}>
        <VueDonnees etat={page}>
          {(resultat) =>
            resultat.colis.length === 0 && recents.length === 0 ? (
              <VueVide
                titre={onglet === 'en_cours' ? 'Aucun envoi en cours' : 'Rien à afficher ici'}
                message={onglet === 'en_cours' ? 'Vos colis apparaîtront ici dès votre première commande.' : undefined}
                icone={Package}
                action={
                  onglet === 'en_cours' && (
                    <Bouton compact onClick={() => naviguer(Routes.envoi)}>
                      Envoyer un colis
                    </Bouton>
                  )
                }
              />
            ) : (
              <>
                <Cascade className="grille grille--2">
                  {resultat.colis.map((colis) =>
                    onglet === 'en_cours' ? (
                      <CarteEnvoi key={colis.codeSuivi} colis={colis} />
                    ) : (
                      <LigneEnvoiTermine key={colis.codeSuivi} colis={colis} />
                    ),
                  )}
                </Cascade>
                {recents.length > 0 && (
                  <>
                    <p className="etiquette-section" style={{ margin: '20px 0 10px', fontSize: 13, letterSpacing: 0.6 }}>
                      Terminés récemment
                    </p>
                    <Cascade className="grille grille--2">
                      {recents.map((colis) => (
                        <LigneEnvoiTermine key={colis.codeSuivi} colis={colis} />
                      ))}
                    </Cascade>
                  </>
                )}
              </>
            )
          }
        </VueDonnees>
      </div>
    </Page>
  );
}

/**
 * Carte d'un envoi en cours : numéro, statut, destinataire, et progression
 * en segments. Bordée d'orange quand le client doit répondre.
 */
function CarteEnvoi({ colis }) {
  const naviguer = useNavigate();
  const action = colis.action?.type;
  const urgent = action in BADGES_ACTION;
  const badge = BADGES_ACTION[action] ?? libelleStatutColis(colis.statut);
  const paiement = colis.paiementStatut === 'paye' ? ' payé' : colis.paiementStatut === 'a_la_livraison' ? ' à la livraison' : '';
  const detail = detailAction(colis) ?? `1 colis ${colis.format?.libelle ?? ''} · ${prix(colis.prix)}${paiement}`;

  return (
    <Carte className={`carte-envoi${urgent ? ' carte-envoi--urgente' : ''}`} onClick={() => ouvrirColis(naviguer, colis)}>
      <div className="rangee" style={{ gap: 8 }}>
        <span className="carte-envoi__code extensible">{colis.codeSuivi}</span>
        <Pastille ton={urgent ? 'vive' : tonStatutColis(colis.statut)}>{badge}</Pastille>
      </div>
      <p className="carte-envoi__ligne" style={{ marginTop: 12 }}>
        Pour <strong>{colis.destinataireNom}</strong>
        {colis.commune ? ` · ${colis.commune}` : ''}
      </p>
      <p className="carte-envoi__ligne" style={{ marginTop: 3 }}>
        {detail}
      </p>
      {!urgent && colis.progression.total > 0 && (
        <div style={{ marginTop: 12 }}>
          <ProgressionSegmentee position={colis.progression.position} total={colis.progression.total} />
        </div>
      )}
    </Carte>
  );
}

/** Badge d'un envoi qui attend le client. */
const BADGES_ACTION = {
  depot_box: 'À déposer',
  nouveau_box: 'Box expiré',
  paiement: 'Paiement en attente',
  complement: 'Complément à payer',
};

/** Ce que le client doit faire, en une ligne ; null si rien n'est attendu. */
export function detailAction(colis) {
  switch (colis.action?.type) {
    case 'depot_box':
      return `Déposez-le dans le box ${colis.action.box ?? ''} avec le code ${colis.action.code ?? ''}`;
    case 'nouveau_box':
      return 'Réservation du box expirée : demandez un nouveau box';
    case 'paiement':
      return 'Réglez la commande pour recevoir votre box de dépôt';
    case 'complement':
      return `Format changé : complément de ${prix(colis.action.montant ?? 0)} à payer`;
    default:
      return null;
  }
}

/** Ligne grise d'un envoi terminé : « CL-... · Yopougon / Livré hier à 16:40 ». */
function LigneEnvoiTermine({ colis }) {
  const naviguer = useNavigate();
  const detail =
    colis.statut === 'livre' && colis.livreLe ? `Livré ${moment(colis.livreLe)}` : (colis.jalonCourant ?? libelleStatutColis(colis.statut));

  return (
    <BlocGris className="ligne-termine" onClick={() => ouvrirColis(naviguer, colis)}>
      <div className="extensible">
        <p style={{ fontSize: 14.5, fontWeight: 700 }}>{colis.commune ? `${colis.codeSuivi} · ${colis.commune}` : colis.codeSuivi}</p>
        <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
          {detail}
        </p>
      </div>
      <Pastille ton={tonStatutColis(colis.statut)}>{libelleStatutColis(colis.statut)}</Pastille>
    </BlocGris>
  );
}
