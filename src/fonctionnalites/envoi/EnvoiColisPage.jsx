import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';

import {
  AvatarInitiales,
  BarreEtapes,
  Bouton,
  BoutonAjout,
  Cascade,
  EncadreInfo,
  EnTete,
  Option,
  Page,
  PetitBouton,
  PiedDAction,
  useMessages,
  VueDonnees,
} from '../../composants';
import { listerFormats, poidsLisible } from '../../commun/formats';
import { Routes } from '../../commun/routes';
import { prenom, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { CarteFragile, ChampDescriptionColis, VignetteFormat } from './ColisCommun';
import { colisComplets, colisEstComplet, etapesEnvoi, totalIndicatif, tousLesColis, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquette A-Envoi-Colis (étape 2) : pour chaque colis du destinataire, le
 * format, le contenu et la fragilité.
 *
 * Écart voulu : la description du contenu est demandée pour chaque colis
 * (l'API l'exige), y compris le premier. Les onglets ne servent plus qu'aux
 * brouillons de l'ancien parcours (V3.3 : un seul destinataire).
 */
export default function EnvoiColisPage() {
  const naviguer = useNavigate();
  const { afficherMessage } = useMessages();
  const { brouillon, modifierColis, retirerColis } = useEnvoi();
  const formats = useDonnees(listerFormats, []);
  const [onglet, setOnglet] = useState(0);

  const { destinataires } = brouillon;
  if (destinataires.length === 0 || !brouillon.collecte) return <Navigate to={Routes.envoi} replace />;

  const indexCourant = Math.min(onglet, destinataires.length - 1);
  const destinataire = destinataires[indexCourant];
  const nbColis = tousLesColis(brouillon).length;

  function continuer() {
    if (!colisComplets(brouillon)) {
      afficherMessage('Choisissez un format et décrivez le contenu de chaque colis.');
      return;
    }
    // Le brouillon est créé à l'étape suivante, avec le mode de réception.
    naviguer(Routes.envoiReception);
  }

  return (
    <Page
      titre="Nouvel envoi"
      entete={<EnTete titre="Nouvel envoi" gris repli={Routes.envoi} />}
      pied={
        <PiedDAction
          arrondi
          entete={
            <>
              <span className="extensible texte-secondaire" style={{ fontSize: 13.5 }}>
                {nbColis} colis · pour {prenom(destinataire.nom)}
              </span>
              <span className="titre" style={{ fontSize: 20 }}>
                {prix(totalIndicatif(brouillon))}
              </span>
            </>
          }
        >
          <Bouton onClick={continuer}>
            Continuer
          </Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={1} />

      <VueDonnees etat={formats}>
        {(listeFormats) => (
          <div style={{ marginTop: 14 }}>
            {destinataires.length > 1 && (
              <div className="onglets-destinataires" role="tablist" style={{ marginBottom: 14 }}>
                {destinataires.map((d, i) => {
                  // Un destinataire dont tous les colis sont décrits porte une coche.
                  const complet = i !== indexCourant && d.colis.every(colisEstComplet);
                  return (
                    <button key={d.cle} type="button" role="tab" aria-selected={i === indexCourant} onClick={() => setOnglet(i)}>
                      {complet ? (
                        <span className="coche-complet">
                          <Check size={14} />
                        </span>
                      ) : (
                        <AvatarInitiales nom={d.nom} rang={i} taille={22} />
                      )}
                      <span className="une-ligne">
                        {prenom(d.nom)} · {d.colis.length} colis
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {destinataire.colis.map((colis, c) => (
              <section className="saisie-colis" key={colis.cle}>
                <div className="rangee" style={{ gap: 12 }}>
                  <div className="extensible">
                    <h2 style={{ fontSize: 19 }}>{c === 0 ? 'Quelle taille fait le colis ?' : `Et le colis ${c + 1} ?`}</h2>
                    <p className="envoi__sous-titre">
                      Colis {c + 1} · pour {destinataire.nom}
                    </p>
                  </div>
                  {destinataire.colis.length > 1 && <PetitBouton onClick={() => retirerColis(indexCourant, c)}>Retirer</PetitBouton>}
                </div>

                <Cascade className="pile" style={{ gap: 10, marginTop: 14 }}>
                  {listeFormats.map((format) => (
                    <Option
                      key={format.id}
                      choisie={colis.format?.id === format.id}
                      onClick={() => modifierColis(indexCourant, c, { format })}
                      style={{ padding: '10px 14px 10px 10px' }}
                    >
                      <div className="rangee" style={{ gap: 14 }}>
                        <VignetteFormat format={format} />
                        <div className="extensible">
                          <p className="titre" style={{ fontSize: 15.5 }}>
                            {format.libelle}
                          </p>
                          <p className="texte-secondaire" style={{ fontSize: 12.5, marginTop: 2 }}>
                            {format.description ? `${format.description} · ` : ''}
                            {poidsLisible(format.poidsMaxKg)}
                          </p>
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 700 }}>{prix(format.prix)}</span>
                      </div>
                    </Option>
                  ))}
                </Cascade>

                <div style={{ marginTop: 14 }}>
                  <ChampDescriptionColis valeur={colis.description} onChange={(description) => modifierColis(indexCourant, c, { description })} />
                </div>
                <div style={{ marginTop: 14 }}>
                  <CarteFragile valeur={colis.fragile} onChange={(fragile) => modifierColis(indexCourant, c, { fragile })} />
                </div>
              </section>
            ))}

            <div style={{ marginTop: 18 }}>
              <BoutonAjout hauteur={48} onClick={() => naviguer(Routes.envoiColisAjout(indexCourant))}>
                Ajouter un colis pour {prenom(destinataire.nom)}
              </BoutonAjout>
            </div>
            <div style={{ marginTop: 14 }}>
              <EncadreInfo>
                Votre colis est pesé et mesuré à la station de départ : si son format change, le prix est ajusté.
              </EncadreInfo>
            </div>
          </div>
        )}
      </VueDonnees>
    </Page>
  );
}
