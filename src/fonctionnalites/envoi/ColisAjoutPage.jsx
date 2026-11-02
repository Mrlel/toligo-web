import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { Check } from 'lucide-react';

import { Bouton, EnTete, Illustration, Option, Page, PiedDAction, useMessages, useRetour, VueDonnees } from '../../composants';
import { illustrationDuFormat, listerFormats, tailleIllustrationFormat } from '../../commun/formats';
import { Routes } from '../../commun/routes';
import { initiales, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { CarteFragile, ChampDescriptionColis } from './ColisCommun';
import { tousLesColis, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquette A-Envoi-Colis-Ajout : ajoute un colis à l'un des destinataires de
 * l'envoi (pour qui, format, contenu, fragilité).
 */
export default function ColisAjoutPage() {
  const [parametres] = useSearchParams();
  const retour = useRetour(Routes.envoiColis);
  const { afficherMessage } = useMessages();
  const { brouillon, ajouterColis } = useEnvoi();
  const formats = useDonnees(listerFormats, []);

  // Destinataire présélectionné : l'onglet d'où l'on vient.
  const [destinataire, setDestinataire] = useState(Number(parametres.get('pour') ?? 0));
  const [format, setFormat] = useState(null);
  const [description, setDescription] = useState('');
  const [fragile, setFragile] = useState(false);

  const { destinataires } = brouillon;
  if (destinataires.length === 0) return <Navigate to={Routes.envoi} replace />;

  function ajouter() {
    if (!format || !description.trim()) {
      afficherMessage('Choisissez un format et décrivez le contenu du colis.');
      return;
    }
    ajouterColis(Math.min(destinataire, destinataires.length - 1), { format, description: description.trim(), fragile });
    retour();
  }

  return (
    <Page
      titre="Ajouter un colis"
      entete={
        <EnTete
          titre="Ajouter un colis"
          sousTitre={`Colis ${tousLesColis(brouillon).length + 1} de la commande`}
          fermer
          gris
          repli={Routes.envoiColis}
        />
      }
      pied={
        <PiedDAction arrondi>
          <Bouton onClick={ajouter}>{format ? `Ajouter ce colis · ${prix(format.prix)}` : 'Ajouter ce colis'}</Bouton>
        </PiedDAction>
      }
    >
      <VueDonnees etat={formats}>
        {(listeFormats) => (
          <div className="pile" style={{ gap: 18 }}>
            <div>
              <p className="etiquette-section" style={{ marginBottom: 10 }}>
                Pour qui ?
              </p>
              <div className="rangee" style={{ gap: 8, flexWrap: 'wrap' }}>
                {destinataires.map((d, i) => (
                  <button
                    key={d.cle}
                    type="button"
                    className={`puce-destinataire${i === destinataire ? ' puce-destinataire--choisie' : ''}`}
                    onClick={() => setDestinataire(i)}
                    aria-pressed={i === destinataire}
                  >
                    <span className="puce-destinataire__initiales">{initiales(d.nom)}</span>
                    {d.nom}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="etiquette-section" style={{ marginBottom: 10 }}>
                Format
              </p>
              <div className="cases-formats">
                {listeFormats.map((f) => (
                  <div className="case-format" key={f.id}>
                    <Option choisie={format?.id === f.id} onClick={() => setFormat(f)} indicateur={false}>
                      <div className="pile" style={{ alignItems: 'center', gap: 4 }}>
                        <span style={{ height: 58, display: 'grid', placeItems: 'center' }}>
                          <Illustration nom={illustrationDuFormat(f.icone, f.code)} taille={tailleIllustrationFormat(f.code)} />
                        </span>
                        <span className="titre" style={{ fontSize: 14.5 }}>
                          {f.libelle}
                        </span>
                        <span className="texte-secondaire" style={{ fontSize: 12 }}>
                          ≤ {String(f.poidsMaxKg).replace('.', ',')} kg
                        </span>
                        <span style={{ fontSize: 13.5, fontWeight: 700 }}>{prix(f.prix)}</span>
                      </div>
                    </Option>
                    {format?.id === f.id && (
                      <span className="case-format__coche">
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <ChampDescriptionColis valeur={description} onChange={setDescription} />
            <CarteFragile valeur={fragile} onChange={setFragile} />
          </div>
        )}
      </VueDonnees>
    </Page>
  );
}
