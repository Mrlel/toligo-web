import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Plus } from 'lucide-react';

import {
  BlocGris,
  BoutonRond,
  Carte,
  Cascade,
  OngletsSegmentes,
  Page,
  Pastille,
  TitreEcran,
  useConfirmation,
  useMessages,
  VueDonnees,
  VueVide,
} from '../../composants';
import { Routes } from '../../commun/routes';
import { dateHeure, duree, jourMois, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { fermerOnglet, ouvrirPagePaiement, preparerOngletPaiement } from '../paiement/paiement';
import { annulerLocation, boxLouees, libelleDuree, listerLocations } from './api';
import './box.css';

/**
 * Maquette A-MesBox : locations en cours, terminées et annulées.
 *
 * L'onglet « En cours » montre aussi les trois dernières locations terminées,
 * pour relouer en un geste.
 */
export default function MesBoxPage() {
  const naviguer = useNavigate();
  const confirmer = useConfirmation();
  const { afficherErreur } = useMessages();
  const locations = useDonnees(listerLocations, []);
  const louees = useDonnees(boxLouees, []);
  const [onglet, setOnglet] = useState('en_cours');
  // Locations dont le code d'accès est affiché en clair.
  const [codesVisibles, setCodesVisibles] = useState([]);

  const liste = locations.donnees ?? [];
  const codes = Object.fromEntries((louees.donnees ?? []).map((b) => [b.locationId, b.code]));
  const enCours = liste.filter((l) => l.estActive || l.estEnAttente);
  const terminees = liste.filter((l) => l.statut === 'terminee').sort((a, b) => (b.fin ?? 0) - (a.fin ?? 0));
  const annulees = liste.filter((l) => l.statut === 'annulee');

  async function annuler(location) {
    const ok = await confirmer({
      titre: 'Annuler cette réservation ?',
      texte: `${location.boxLibelle} sera libéré.`,
      accepter: 'Annuler la réservation',
      refuser: 'Garder',
      danger: true,
    });
    if (!ok) return;
    try {
      await annulerLocation(location.id);
      locations.recharger();
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  const relouer = (location) => naviguer(Routes.boxObjet(location.entrepot.id), { state: { entrepot: location.entrepot } });
  const basculerCode = (id) => setCodesVisibles((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  const ligne = (l) => <LigneTerminee key={l.id} location={l} onRelouer={l.entrepot ? () => relouer(l) : null} />;

  return (
    <Page titre="Mes box" largeur="moyenne">
      <TitreEcran action={<BoutonRond icone={Plus} libelle="Louer un box" apparence="noir" onClick={() => naviguer(Routes.entrepots)} />}>
        Mes box
      </TitreEcran>

      <OngletsSegmentes
        onglets={[
          { cle: 'en_cours', libelle: enCours.length > 0 ? `En cours · ${enCours.length}` : 'En cours' },
          { cle: 'terminees', libelle: 'Terminées' },
          { cle: 'annulees', libelle: 'Annulées' },
        ]}
        courant={onglet}
        onChoisir={setOnglet}
      />

      <div style={{ marginTop: 16 }}>
        <VueDonnees etat={locations}>
          {() => {
            if (onglet === 'terminees') {
              return terminees.length === 0 ? (
                <VueVide titre="Aucune location terminée" icone={Lock} />
              ) : (
                <Cascade className="grille grille--2">{terminees.map(ligne)}</Cascade>
              );
            }
            if (onglet === 'annulees') {
              return annulees.length === 0 ? (
                <VueVide titre="Aucune location annulée" icone={Lock} />
              ) : (
                <Cascade className="grille grille--2">{annulees.map(ligne)}</Cascade>
              );
            }
            return (
              <>
                {enCours.length === 0 && <VueVide titre="Aucune location en cours" icone={Lock} />}
                <Cascade className="grille grille--2">
                  {enCours.map((l) =>
                    l.estActive ? (
                      <CarteActive
                        key={l.id}
                        location={l}
                        code={codes[l.id] ?? null}
                        codeVisible={codesVisibles.includes(l.id)}
                        onAfficher={() => basculerCode(l.id)}
                      />
                    ) : (
                      <CarteEnAttente key={l.id} location={l} onAnnuler={() => annuler(l)} />
                    ),
                  )}
                </Cascade>
                {terminees.length > 0 && (
                  <>
                    <p className="etiquette-section" style={{ margin: '20px 0 10px', fontSize: 13, letterSpacing: 0.6 }}>
                      Terminées récemment
                    </p>
                    <Cascade className="grille grille--2">{terminees.slice(0, 3).map(ligne)}</Cascade>
                  </>
                )}
              </>
            );
          }}
        </VueDonnees>
      </div>
    </Page>
  );
}

/** « 4827193 » -> « 482 7193 » ; masqué : « ••• •••• ». */
function afficherCode(code, masque) {
  const chiffres = masque ? '•'.repeat(code.length) : code;
  const milieu = Math.floor(code.length / 2);
  return code.length < 6 ? chiffres : `${chiffres.slice(0, milieu)} ${chiffres.slice(milieu)}`;
}

/** Location active : carte noire avec le code d'accès, masqué par défaut. */
function CarteActive({ location, code, codeVisible, onAfficher }) {
  const naviguer = useNavigate();
  const reste = location.fin ? location.fin.getTime() - Date.now() : null;

  return (
    <div
      className="carte-code carte-code--cliquable"
      role="button"
      tabIndex={0}
      onClick={() => naviguer(Routes.boxDetail(location.id))}
      onKeyDown={(e) => e.key === 'Enter' && e.target === e.currentTarget && naviguer(Routes.boxDetail(location.id))}
    >
      <div className="rangee" style={{ gap: 8, alignItems: 'flex-start' }}>
        <div className="extensible">
          <p className="titre" style={{ fontSize: 18 }}>
            {location.boxLibelle}
          </p>
          <p className="carte-code__gris" style={{ fontSize: 13, marginTop: 2 }}>
            {[location.entrepotNom, location.objetNom].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Pastille ton="succes">Active</Pastille>
      </div>

      <div className="zone-code" style={{ marginTop: 14 }}>
        <div className="extensible">
          <p className="carte-code__gris" style={{ fontSize: 12 }}>
            Code d'accès
          </p>
          {code ? (
            <p className="titre" style={{ fontSize: 20, letterSpacing: 4, marginTop: 2 }}>
              {afficherCode(code, !codeVisible)}
            </p>
          ) : (
            <p style={{ fontSize: 15, fontWeight: 600, marginTop: 2 }}>En préparation…</p>
          )}
        </div>
        {code && (
          <button
            type="button"
            className="bouton-sur-noir bouton-sur-noir--blanc"
            style={{ height: 36, borderRadius: 14 }}
            onClick={(e) => {
              e.stopPropagation();
              onAfficher();
            }}
          >
            {codeVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            {codeVisible ? 'Masquer' : 'Afficher'}
          </button>
        )}
      </div>

      <div className="rangee" style={{ gap: 8, marginTop: 14, fontSize: 13 }}>
        <span className="extensible carte-code__gris">Jusqu'au {dateHeure(location.fin)}</span>
        {reste !== null && <strong>Il reste {duree(reste)}</strong>}
      </div>
    </div>
  );
}

/** Location réservée mais pas encore payée : annuler ou payer. */
function CarteEnAttente({ location, onAnnuler }) {
  const { afficherMessage } = useMessages();
  const details = [location.entrepotNom, location.objetNom ?? location.objetCategorie, location.dureeHeures ? libelleDuree(location.dureeHeures) : null];

  function payer() {
    const onglet = preparerOngletPaiement();
    if (!ouvrirPagePaiement(location.paiementCheckoutUrl, onglet)) {
      fermerOnglet(onglet);
      afficherMessage("Impossible d'ouvrir la page de paiement. Autorisez les fenêtres pop-up pour ce site.");
    }
  }

  return (
    <Carte>
      <div className="rangee" style={{ gap: 8, alignItems: 'flex-start' }}>
        <div className="extensible">
          <p style={{ fontSize: 15, fontWeight: 700 }}>{location.boxLibelle}</p>
          <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
            {details.filter(Boolean).join(' · ')}
          </p>
        </div>
        <Pastille ton="accent">Paiement en attente</Pastille>
      </div>
      <div className="rangee" style={{ gap: 8, marginTop: 12 }}>
        <button type="button" className="bouton bouton--contour-danger bouton--compact extensible" onClick={onAnnuler}>
          Annuler
        </button>
        <button
          type="button"
          className="bouton bouton--accent bouton--compact extensible"
          disabled={!location.paiementCheckoutUrl}
          onClick={payer}
        >
          Payer {prix(location.montant)}
        </button>
      </div>
    </Carte>
  );
}

/** Location terminée ou annulée, sur fond gris, avec « Relouer ». */
function LigneTerminee({ location, onRelouer }) {
  const annulee = location.statut === 'annulee';
  const quand = annulee
    ? location.debut
      ? `Annulée · prévue le ${jourMois(location.debut)}`
      : 'Annulée'
    : location.fin
      ? `Terminée le ${jourMois(location.fin)}`
      : 'Terminée';
  const titre = [location.boxLibelle, location.entrepotNom].filter(Boolean).join(' · ');

  return (
    <BlocGris className="rangee" style={{ gap: 12, padding: '12px 14px', borderRadius: 22 }} onClick={onRelouer ?? undefined}>
      <div className="extensible">
        <p style={{ fontSize: 14.5, fontWeight: 700 }}>{titre}</p>
        <p className="texte-secondaire" style={{ fontSize: 13, marginTop: 2 }}>
          {location.dureeHeures ? `${quand} · ${libelleDuree(location.dureeHeures)}` : quand}
        </p>
      </div>
      {onRelouer && <span style={{ fontSize: 13, fontWeight: 600 }}>Relouer</span>}
    </BlocGris>
  );
}
