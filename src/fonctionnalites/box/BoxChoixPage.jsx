import { useCallback, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Lock, Luggage, Package } from 'lucide-react';

import {
  Bouton,
  Carte,
  Cascade,
  EncadreInfo,
  EnTete,
  Option,
  Page,
  PiedDAction,
  useMessages,
  useRetour,
  VueVide,
} from '../../composants';
import { Routes } from '../../commun/routes';
import { jourEtHeure, majuscule, prix } from '../../utils/formatage';
import { AttentePaiement, fermerOnglet, ouvrirPagePaiement, preparerOngletPaiement, verifierPaiement } from '../paiement/paiement';
import { libelleDuree, listerLocations, nomCourt, reserverBox } from './api';
import './box.css';

/**
 * Maquette A-Box-Choix (étape 2 sur 2) : choix de la box et paiement.
 * La recherche et les box proposées arrivent de l'écran « Que stockez-vous ? ».
 */
export default function BoxChoixPage() {
  const { state } = useLocation();
  if (!state?.recherche) return <Navigate to={Routes.entrepots} replace />;
  return <ChoixBox recherche={state.recherche} boxes={state.boxes ?? []} />;
}

function ChoixBox({ recherche, boxes }) {
  const naviguer = useNavigate();
  const retour = useRetour(Routes.entrepots);
  const { afficherMessage, afficherErreur } = useMessages();

  const [choisie, setChoisie] = useState(boxes[0] ?? null);
  const [urlPaiement, setUrlPaiement] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const debut = new Date(recherche.debut);
  const fin = new Date(recherche.fin);
  const heures = Math.round((fin - debut) / 3600000);

  async function payer() {
    const onglet = preparerOngletPaiement();
    setEnCours(true);
    try {
      // Une fois la réservation créée, on garde la même page de paiement.
      const url = urlPaiement ?? (await reserverBox(recherche, choisie));
      setUrlPaiement(url);
      if (!ouvrirPagePaiement(url, onglet)) {
        afficherMessage("Impossible d'ouvrir la page de paiement. Autorisez les fenêtres pop-up pour ce site.");
      }
    } catch (erreur) {
      fermerOnglet(onglet);
      afficherErreur(erreur);
    } finally {
      setEnCours(false);
    }
  }

  /** Vrai quand la location créée pour cette box et cette période est payée. */
  const estPayee = useCallback(async () => {
    const locations = await listerLocations();
    const location = locations.find(
      (l) => l.caisseId === choisie?.id && l.debut && Math.abs(l.debut.getTime() - debut.getTime()) < 60000,
    );
    if (!location) return false;
    if (location.estActive || (await verifierPaiement(location.paiementReference))) {
      naviguer(Routes.boxConfirmee(location.id), { replace: true });
      return true;
    }
    return false;
  }, [choisie, debut.getTime(), naviguer]); // eslint-disable-line react-hooks/exhaustive-deps

  const nombre = boxes.length;

  return (
    <Page
      titre="Choisissez votre box"
      entete={<EnTete titre="Choisissez votre box" sousTitre={`${nomCourt(recherche.entrepot.nom)} · étape 2 sur 2`} repli={Routes.entrepots} />}
      pied={
        choisie &&
        !urlPaiement && (
          <PiedDAction>
            <Bouton variante="accent" enCours={enCours} onClick={payer}>
              Payer {prix(choisie.prixTotal)}
            </Bouton>
            <p className="pied__note">Paiement mobile money sécurisé</p>
          </PiedDAction>
        )
      }
    >
      {/* Rappel de l'objet : « Valise cabine · 55 × 40 × 25 cm · 24 h  Modifier ». */}
      <div className="encadre-info" style={{ alignItems: 'center', color: 'var(--encre)', padding: '6px 4px 6px 12px' }}>
        <Luggage size={18} />
        <span className="extensible" style={{ fontSize: 13.5 }}>
          <strong>{recherche.libelleObjet}</strong> · {Math.round(recherche.longueur)} × {Math.round(recherche.largeur)} ×{' '}
          {Math.round(recherche.hauteur)} cm · {libelleDuree(heures)}
        </span>
        {!urlPaiement && (
          <button type="button" className="lien" onClick={retour}>
            Modifier
          </button>
        )}
      </div>

      {nombre === 0 ? (
        <VueVide
          titre="Aucune box disponible"
          message="Essayez une autre période, un autre entrepôt ou des dimensions plus petites."
          icone={Package}
        />
      ) : (
        <>
          <p className="texte-secondaire" style={{ fontSize: 13.5, margin: '14px 0 10px' }}>
            {nombre} box adaptée{nombre > 1 ? 's' : ''} à votre objet
          </p>
          <Cascade className="pile" style={{ gap: 8 }}>
            {boxes.map((box) => (
              <Option
                key={box.id}
                choisie={box.id === choisie?.id}
                indicateur={false}
                desactivee={Boolean(urlPaiement) && box.id !== choisie?.id}
                onClick={() => !urlPaiement && setChoisie(box)}
              >
                <div className="rangee" style={{ gap: 12 }}>
                  <span className="lettre-box">{box.taille}</span>
                  <div className="extensible">
                    <p style={{ fontSize: 15, fontWeight: 700 }}>BOX-{box.numero}</p>
                    <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                      {[box.dimensions, box.poidsMax !== null ? `${Math.round(box.poidsMax)} kg max` : null, `${prix(box.prixParHeure)}/h`]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <span className="titre" style={{ fontSize: 15 }}>
                    {prix(box.prixTotal)}
                  </span>
                </div>
              </Option>
            ))}
          </Cascade>

          {choisie && (
            <>
              <Carte style={{ marginTop: 14 }}>
                <div className="rangee" style={{ gap: 12, fontSize: 14, alignItems: 'flex-start' }}>
                  <span className="texte-secondaire">Période</span>
                  <span className="extensible demi-gras" style={{ textAlign: 'right' }}>
                    {majuscule(jourEtHeure(debut))} → {jourEtHeure(fin)}
                  </span>
                </div>
                <div className="rangee" style={{ gap: 12, fontSize: 14, marginTop: 10 }}>
                  <span className="texte-secondaire">Calcul</span>
                  <span className="extensible demi-gras" style={{ textAlign: 'right' }}>
                    {heures} h × {prix(choisie.prixParHeure)}
                  </span>
                </div>
                <hr className="separateur" style={{ margin: '10px 0' }} />
                <div className="total">
                  <h3>Total</h3>
                  <strong>{prix(choisie.prixTotal)}</strong>
                </div>
              </Carte>
              <div style={{ marginTop: 14 }}>
                <EncadreInfo icone={Lock}>
                  Après le paiement, votre code d'accès au box vous est envoyé par notification et par SMS.
                </EncadreInfo>
              </div>
            </>
          )}

          {urlPaiement && (
            <div style={{ marginTop: 16 }}>
              <AttentePaiement estPaye={estPayee} onPaye={() => {}} onRelancer={payer} />
            </div>
          )}
        </>
      )}
    </Page>
  );
}
