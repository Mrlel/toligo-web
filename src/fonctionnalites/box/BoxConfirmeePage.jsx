import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, Navigation } from 'lucide-react';

import { Bouton, Carte, Page, PiedDAction, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { jourEtHeure, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { boxLouees, detailLocation, nomCourt } from './api';
import './box.css';

/**
 * Maquette A-Box-Confirmee : box réservée et payée.
 *
 * Les deux dernières étapes (code d'accès prêt, puis envoyé) se cochent dès
 * que le serveur fournit le code de la serrure ; on le relit toutes les 15 s.
 */
export default function BoxConfirmeePage() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const location = useDonnees(() => detailLocation(id), [id]);
  const louees = useDonnees(boxLouees, []);
  const codePret = louees.donnees?.some((b) => b.locationId === id && b.code) ?? false;

  useEffect(() => {
    if (codePret) return undefined;
    const minuteur = setInterval(louees.recharger, 15000);
    return () => clearInterval(minuteur);
  }, [codePret, louees.recharger]);

  return (
    <Page
      titre="Box réservé"
      pied={
        <PiedDAction>
          <Bouton onClick={() => naviguer(Routes.boxDetail(id), { replace: true })}>Voir mon box</Bouton>
          <Bouton variante="contour" onClick={() => naviguer(Routes.accueil)}>
            Retour à l'accueil
          </Bouton>
        </PiedDAction>
      }
    >
      <VueDonnees etat={location}>
        {(l) => {
          const nomEntrepot = l.entrepot ? nomCourt(l.entrepot.nom) : (l.entrepotNom ?? '');
          return (
            <div style={{ paddingTop: 45 }}>
              <div className="box-confirmee__coche">
                <span>
                  <Check size={34} strokeWidth={3} />
                </span>
              </div>
              <h1 style={{ fontSize: 25, textAlign: 'center', marginTop: 18 }}>Box réservé</h1>
              <p className="texte-secondaire" style={{ fontSize: 15, lineHeight: 1.5, textAlign: 'center', maxWidth: 320, margin: '8px auto 0' }}>
                {l.boxLibelle} vous attend à l'entrepôt {nomEntrepot}, du {jourEtHeure(l.debut)} au {jourEtHeure(l.fin)}.
              </p>

              <Carte style={{ padding: 16, marginTop: 22 }}>
                <div className="pile" style={{ gap: 14 }}>
                  <Etape etat="fait" libelle="Paiement reçu" valeur={prix(l.montant)} />
                  <Etape etat="fait" libelle="Box réservé à votre nom" valeur={l.boxLibelle} />
                  <Etape etat={codePret ? 'fait' : 'en-cours'} libelle={codePret ? "Code d'accès prêt" : "Code d'accès en préparation"} />
                  <Etape
                    etat={codePret ? 'fait' : 'a-venir'}
                    libelle={codePret ? 'Code envoyé par SMS et notification' : 'Envoi du code par SMS et notification'}
                  />
                </div>
              </Carte>

              {l.entrepotLatitude !== null && l.entrepotLongitude !== null && (
                <a
                  className="bloc-gris rangee"
                  style={{ gap: 12, marginTop: 22, padding: '12px 14px', borderRadius: 'var(--rayon-option)' }}
                  href={`https://www.google.com/maps/search/?api=1&query=${l.entrepotLatitude},${l.entrepotLongitude}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="vignette" style={{ width: 40, height: 40, background: 'var(--blanc)' }}>
                    <Navigation size={20} />
                  </span>
                  <span className="extensible">
                    <span className="demi-gras" style={{ display: 'block', fontSize: 14.5 }}>
                      Itinéraire vers l'entrepôt
                    </span>
                    <span className="texte-secondaire" style={{ display: 'block', fontSize: 12.5 }}>
                      {[nomEntrepot, l.entrepot?.commune].filter(Boolean).join(', ')}
                    </span>
                  </span>
                  <ChevronRight size={20} />
                </a>
              )}
            </div>
          );
        }}
      </VueDonnees>
    </Page>
  );
}

/** Une ligne de la liste d'étapes : rond vert coché, anneau orange qui tourne, ou rond gris vide. */
function Etape({ etat, libelle, valeur }) {
  const style =
    etat === 'fait'
      ? { fontWeight: 600 }
      : etat === 'en-cours'
        ? { fontWeight: 700, color: 'var(--accent-fonce)' }
        : { color: 'var(--texte-secondaire)' };
  return (
    <div className="etape-box">
      <span className={`etape-box__pastille etape-box__pastille--${etat}`}>{etat === 'fait' && <Check size={14} strokeWidth={3} />}</span>
      <span className="extensible" style={style}>
        {libelle}
      </span>
      {valeur && (
        <span className="texte-secondaire" style={{ fontSize: 13 }}>
          {valeur}
        </span>
      )}
    </div>
  );
}
