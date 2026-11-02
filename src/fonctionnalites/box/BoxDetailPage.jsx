import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Copy, KeyRound, Navigation, RefreshCw } from 'lucide-react';

import { Carte, EnTete, LigneInfo, Page, Pastille, useMessages, VueDonnees } from '../../composants';
import { Routes } from '../../commun/routes';
import { duree, estAujourdhui, heure, jourMois, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { boxLouees, codesTemporaires, detailLocation, libelleStatutLocation, nomCourt, regenererCode, revoquerCode } from './api';
import './box.css';

const formatFin = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatPeriode = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

/** La location, sa box louée (code principal) et ses codes temporaires. */
async function chargerDetail(id) {
  const [location, louees, codes] = await Promise.all([detailLocation(id), boxLouees(), codesTemporaires(id)]);
  return { location, boxLouee: louees.find((b) => b.locationId === id) ?? null, codes };
}

/** Maquette A-Box-Detail : code d'accès, codes temporaires, infos de location. */
export default function BoxDetailPage() {
  const { id } = useParams();
  const naviguer = useNavigate();
  const { afficherMessage, afficherErreur } = useMessages();
  const detail = useDonnees(() => chargerDetail(id), [id]);
  const [regeneration, setRegeneration] = useState(false);

  const location = detail.donnees?.location;
  const nomEntrepot = location ? (location.entrepot ? nomCourt(location.entrepot.nom) : location.entrepotNom) : null;

  async function nouveauCode() {
    setRegeneration(true);
    try {
      await regenererCode(id);
      detail.recharger();
      afficherMessage("Nouveau code généré. L'ancien ne fonctionne plus.");
    } catch (erreur) {
      afficherErreur(erreur);
    } finally {
      setRegeneration(false);
    }
  }

  async function revoquer(code) {
    try {
      await revoquerCode(code.id);
      detail.recharger();
      afficherMessage('Code temporaire révoqué.');
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  async function copier(code) {
    try {
      await navigator.clipboard.writeText(code);
      afficherMessage('Code copié.');
    } catch {
      afficherMessage(`Code : ${code}`);
    }
  }

  return (
    <Page
      titre={location?.boxLibelle ?? 'Mon box'}
      entete={<EnTete titre={location?.boxLibelle ?? 'Mon box'} sousTitre={nomEntrepot ? `Entrepôt ${nomEntrepot}` : undefined} repli={Routes.mesBox} />}
    >
      <VueDonnees etat={detail}>
        {({ location: l, boxLouee, codes }) => {
          const code = boxLouee?.code ?? null;
          const reste = l.fin ? l.fin.getTime() - Date.now() : null;
          const itineraire = boxLouee?.lienItineraire;

          return (
            <div className="pile" style={{ gap: 16 }}>
              {/* Carte noire du code d'accès : un chiffre par case, copier, nouveau code. */}
              <div className="carte-code">
                <div className="rangee" style={{ gap: 8 }}>
                  <span className="extensible carte-code__gris" style={{ fontSize: 13, fontWeight: 600 }}>
                    Votre code d'accès
                  </span>
                  {l.estActive ? (
                    <Pastille ton="succes">
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--succes)' }} />
                      Actif
                    </Pastille>
                  ) : (
                    <Pastille>{libelleStatutLocation(l.statut)}</Pastille>
                  )}
                </div>
                <div style={{ marginTop: 14 }}>
                  {code ? (
                    <div className="chiffres-code" aria-label={`Code ${code}`}>
                      {code.split('').map((chiffre, i) => (
                        <span key={i} aria-hidden="true">
                          {chiffre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="titre" style={{ fontSize: 18 }}>
                      Code en préparation…
                    </p>
                  )}
                </div>
                <p className="carte-code__gris" style={{ fontSize: 13, lineHeight: 1.4, marginTop: 14 }}>
                  Saisissez ce code sur le clavier de la serrure du box. Valable jusqu'au {l.fin ? formatFin.format(l.fin) : '—'}.
                </p>
                <div className="rangee" style={{ gap: 8, marginTop: 14 }}>
                  <button type="button" className="bouton-sur-noir bouton-sur-noir--blanc extensible" disabled={!code} onClick={() => copier(code)}>
                    <Copy size={17} /> Copier
                  </button>
                  <button
                    type="button"
                    className="bouton-sur-noir bouton-sur-noir--contour extensible"
                    disabled={regeneration || !l.estActive}
                    onClick={nouveauCode}
                  >
                    <RefreshCw size={17} /> {regeneration ? 'Patientez…' : 'Nouveau code'}
                  </button>
                </div>
              </div>

              <div className="grille" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  type="button"
                  className="raccourci-box"
                  style={{ background: 'var(--accent-clair)' }}
                  disabled={!l.estActive}
                  onClick={() => naviguer(Routes.codeTemporaire(id))}
                >
                  <span className="raccourci-box__icone" style={{ background: 'var(--accent)' }}>
                    <KeyRound size={19} />
                  </span>
                  <span className="extensible">
                    <span className="une-ligne" style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
                      Code temporaire
                    </span>
                    <span style={{ display: 'block', fontSize: 12, color: 'var(--info)' }}>Pour un proche ou un livreur</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="raccourci-box"
                  disabled={!itineraire}
                  onClick={() => window.open(itineraire, '_blank', 'noopener')}
                >
                  <span className="raccourci-box__icone">
                    <Navigation size={19} />
                  </span>
                  <span className="extensible">
                    <span className="une-ligne" style={{ display: 'block', fontSize: 14, fontWeight: 700 }}>
                      Itinéraire
                    </span>
                    <span className="une-ligne" style={{ display: 'block', fontSize: 12, color: 'var(--info)' }}>
                      {l.entrepot?.commune ?? nomEntrepot ?? ''}
                    </span>
                  </span>
                </button>
              </div>

              <Carte sansMarge>
                <LigneInfo libelle="Objet stocké" valeur={l.objetNom ?? '—'} />
                <hr className="separateur" />
                <LigneInfo
                  libelle="Période"
                  valeur={l.debut && l.fin ? `${formatPeriode.format(l.debut)} → ${formatPeriode.format(l.fin)}` : '—'}
                />
                {reste !== null && l.estActive && (
                  <>
                    <hr className="separateur" />
                    <LigneInfo libelle="Temps restant" valeur={duree(reste)} valeurClasse="texte-accent-fonce" />
                  </>
                )}
                <hr className="separateur" />
                <LigneInfo libelle="Payé" valeur={`${prix(l.montant)} · mobile money`} />
              </Carte>

              {codes.length > 0 && (
                <div className="pile" style={{ gap: 8 }}>
                  <p className="etiquette-section" style={{ fontSize: 13, letterSpacing: 0.6 }}>
                    Codes temporaires
                  </p>
                  {codes.map((c) => (
                    <LigneCodeTemporaire key={c.id} code={c} onRevoquer={() => revoquer(c)} />
                  ))}
                </div>
              )}
            </div>
          );
        }}
      </VueDonnees>
    </Page>
  );
}

/** « aujourd'hui de 14:00 à 20:00 », « le 9 oct. de 14:00 à 20:00 » */
function creneau(code) {
  if (!code.debut) return '';
  const jour = estAujourdhui(code.debut) ? "aujourd'hui" : `le ${jourMois(code.debut)}`;
  return `${jour} de ${heure(code.debut)} à ${heure(code.fin)}`;
}

/** Code temporaire : nom, code et créneau ; « Révoquer » tant qu'il est actif. */
function LigneCodeTemporaire({ code, onRevoquer }) {
  const plage = creneau(code);
  return (
    <div className="bloc-gris rangee" style={{ gap: 12, padding: '12px 14px', borderRadius: 'var(--rayon-champ)' }}>
      <div className="extensible">
        <p style={{ fontSize: 14, fontWeight: 700 }}>{code.libelle ?? 'Code temporaire'}</p>
        <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
          {[`Code ${code.code}`, plage ? `valable ${plage}` : null].filter(Boolean).join(' · ')}
        </p>
      </div>
      {code.actif ? (
        <button type="button" className="petit-bouton" style={{ background: 'var(--blanc)', color: 'var(--erreur)', border: '1px solid var(--separateur)', borderRadius: 14 }} onClick={onRevoquer}>
          Révoquer
        </button>
      ) : (
        <Pastille>Expiré</Pastille>
      )}
    </div>
  );
}
