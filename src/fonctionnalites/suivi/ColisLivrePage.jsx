import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Check, ChevronRight, CircleAlert, Star } from 'lucide-react';

import { Bouton, Carte, Champ, EncadreInfo, EnTete, LigneInfo, Page, PiedDAction, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { heure } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { detailColis, evaluerLivraison } from './api';
import './suivi.css';

const ETIQUETTES = [
  ['rapide', 'Rapide'],
  ['livreur_courtois', 'Livreur courtois'],
  ['colis_intact', 'Colis intact'],
  ['bien_informe', 'Bien informé'],
];

/** « Route + drone + route » d'après les étapes du trajet. */
function libelleTrajet(etapes) {
  if (etapes.length === 0) return 'Route';
  return etapes
    .map((e) => (e === 'drone' ? 'drone' : 'route'))
    .join(' + ')
    .replace(/^route/, 'Route')
    .replace(/^drone/, 'Drone');
}

/** Maquette A-Livre : colis livré, preuve de remise et évaluation. */
export default function ColisLivrePage() {
  const { code } = useParams();
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const colis = useDonnees(() => detailColis(code), [code]);

  const [note, setNote] = useState(0);
  const [choisies, setChoisies] = useState([]);
  const [commentaire, setCommentaire] = useState('');
  const [enCours, setEnCours] = useState(false);

  const dejaNote = colis.donnees?.note !== null && colis.donnees?.note !== undefined;

  async function envoyer() {
    if (note === 0) {
      afficherMessage('Choisissez une note de 1 à 5 étoiles.');
      return;
    }
    setEnCours(true);
    try {
      await evaluerLivraison(code, { note, etiquettes: choisies, commentaire: commentaire.trim() });
      afficherMessage('Merci pour votre avis !');
      naviguer(Routes.accueil);
    } catch (erreur) {
      afficherErreur(erreur);
      setEnCours(false);
    }
  }

  const basculer = (etiquette) =>
    setChoisies((liste) => (liste.includes(etiquette) ? liste.filter((e) => e !== etiquette) : [...liste, etiquette]));

  return (
    <Page
      titre={`Colis ${code}`}
      entete={<EnTete titre={code} fermer repli={Routes.envois} />}
      pied={
        colis.donnees &&
        !dejaNote && (
          <PiedDAction>
            <Bouton enCours={enCours} onClick={envoyer}>
              Envoyer mon avis
            </Bouton>
          </PiedDAction>
        )
      }
    >
      <VueDonnees etat={colis}>
        {(c) => (
          <div className="pile" style={{ gap: 18 }}>
            <div className="bandeau-livre">
              <span className="bandeau-livre__coche">
                <Check size={24} strokeWidth={3} />
              </span>
              <div>
                <h1 style={{ fontSize: 19, color: 'var(--succes-fonce)' }}>Colis livré</h1>
                <p style={{ fontSize: 13.5, color: '#24563f', marginTop: 2 }}>
                  Remis à {c.remisA ?? c.destinataireNom}
                  {c.livreLe ? ` à ${heure(c.livreLe)}` : ''}
                </p>
              </div>
            </div>

            <Carte sansMarge>
              <LigneInfo libelle="Trajet" valeur={libelleTrajet(c.trajet)} />
              {c.dernierLivreur && (
                <>
                  <hr className="separateur" />
                  <LigneInfo libelle="Dernier livreur" valeur={`${c.dernierLivreur}${c.vehicule ? ` · ${c.vehicule}` : ''}`} />
                </>
              )}
              <hr className="separateur" />
              <LigneInfo libelle="Preuve de remise" valeur="Voir" onClick={() => naviguer(Routes.preuves(c.codeSuivi))}>
                <ChevronRight size={16} />
              </LigneInfo>
            </Carte>

            {dejaNote ? (
              <EncadreInfo icone={Star}>Vous avez noté cette livraison {c.note}/5. Merci !</EncadreInfo>
            ) : (
              <div className="pile" style={{ gap: 12 }}>
                <h2 style={{ fontSize: 18, textAlign: 'center' }}>Comment s'est passée la livraison ?</h2>
                <div className="etoiles" role="radiogroup" aria-label="Note de la livraison">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <button
                      key={i}
                      type="button"
                      role="radio"
                      aria-checked={note === i}
                      aria-label={`${i} étoile${i > 1 ? 's' : ''}`}
                      onClick={() => setNote(i)}
                    >
                      <Star size={34} fill={i <= note ? 'var(--accent)' : 'var(--gris-rond)'} color={i <= note ? 'var(--accent)' : 'var(--gris-rond)'} />
                    </button>
                  ))}
                </div>
                <div className="rangee" style={{ gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {ETIQUETTES.map(([cle, libelle]) => (
                    <button
                      key={cle}
                      type="button"
                      className={`etiquette-avis${choisies.includes(cle) ? ' etiquette-avis--choisie' : ''}`}
                      aria-pressed={choisies.includes(cle)}
                      onClick={() => basculer(cle)}
                    >
                      {libelle}
                    </button>
                  ))}
                </div>
                <Champ
                  multiligne
                  lignes={2}
                  bordee
                  placeholder="Un commentaire ? (facultatif)"
                  aria-label="Commentaire"
                  value={commentaire}
                  onChange={(e) => setCommentaire(e.target.value)}
                />
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <button
                type="button"
                className="lien lien--erreur rangee"
                style={{ display: 'inline-flex', gap: 6 }}
                onClick={() => naviguer(Routes.incident(c.codeSuivi))}
              >
                <CircleAlert size={18} />
                Un problème avec ce colis ?
              </button>
            </div>
          </div>
        )}
      </VueDonnees>
    </Page>
  );
}
