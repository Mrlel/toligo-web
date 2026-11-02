import { useState } from 'react';
import { ChevronRight, Ellipsis, LocateFixed, MapPin, Pencil, Star, Trash2 } from 'lucide-react';

import { BoutonAjout, Carte, Cascade, EnTete, Modale, Page, useConfirmation, useMessages, VueDonnees, VueVide } from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { useDonnees } from '../../utils/useDonnees';
import { definirParDefaut, listerAdresses, supprimerAdresse } from './api';
import { FormulaireAdresse } from './FormulaireAdresse';
import { IconeAdresse } from './IconeAdresse';
import '../envoi/envoi.css';

/** Maquette A-Adresses : carnet d'adresses du client. */
export default function AdressesPage() {
  const confirmer = useConfirmation();
  const { rechargerProfil } = useSession();
  const { afficherMessage, afficherErreur } = useMessages();
  const adresses = useDonnees(listerAdresses, []);

  // Adresse dont on affiche les options (Modifier, Par défaut, Supprimer).
  const [options, setOptions] = useState(null);
  // Formulaire : null (fermé) ou ses paramètres { adresse, depuisPosition }.
  const [formulaire, setFormulaire] = useState(null);

  function actualiser() {
    adresses.recharger();
    rechargerProfil();
  }

  async function choisirOption(choix) {
    const adresse = options;
    setOptions(null);
    try {
      if (choix === 'modifier') {
        setFormulaire({ adresse });
      } else if (choix === 'defaut') {
        await definirParDefaut(adresse.id);
        afficherMessage(`« ${adresse.libelle} » est maintenant votre adresse par défaut.`);
        actualiser();
      } else if (choix === 'supprimer') {
        const ok = await confirmer({
          titre: 'Supprimer cette adresse ?',
          texte: `« ${adresse.libelle} » sera retirée de votre carnet.`,
          accepter: 'Supprimer',
          danger: true,
        });
        if (!ok) return;
        await supprimerAdresse(adresse.id);
        actualiser();
      }
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  return (
    <Page titre="Mes adresses" entete={<EnTete titre="Mes adresses" repli={Routes.profil} />}>
      <VueDonnees etat={adresses}>
        {(liste) => (
          <div className="pile" style={{ gap: 16 }}>
            <button
              type="button"
              className="bloc-gris rangee"
              style={{ gap: 12, height: 56, padding: '0 12px 0 16px', borderRadius: 'var(--rayon-option)', background: 'var(--surface-alt)', border: 0 }}
              onClick={() => setFormulaire({ depuisPosition: true })}
            >
              <LocateFixed size={20} />
              <span className="extensible demi-gras" style={{ fontSize: 15, textAlign: 'left' }}>
                Utiliser ma position actuelle
              </span>
              <ChevronRight size={20} color="var(--texte-secondaire)" />
            </button>

            {liste.length === 0 ? (
              <VueVide
                titre="Aucune adresse enregistrée"
                message="Ajoutez votre domicile ou votre bureau pour commander plus vite."
                icone={MapPin}
              />
            ) : (
              <Carte sansMarge>
                <Cascade>
                  {liste.map((adresse, i) => (
                    <div key={adresse.id}>
                      {i > 0 && <hr className="separateur" style={{ marginLeft: 68 }} />}
                      <LigneAdresse adresse={adresse} onOptions={() => setOptions(adresse)} />
                    </div>
                  ))}
                </Cascade>
              </Carte>
            )}

            <BoutonAjout hauteur={52} onClick={() => setFormulaire({})}>
              Ajouter une adresse
            </BoutonAjout>
            <p className="texte-secondaire" style={{ fontSize: 13, lineHeight: 1.45 }}>
              Ajoutez un repère (couleur du portail, commerce voisin) : le livreur trouve plus vite.
            </p>
          </div>
        )}
      </VueDonnees>

      <Modale ouverte={options !== null} onFermer={() => setOptions(null)} titre={options?.libelle}>
        <div className="actions-liste">
          <button type="button" onClick={() => choisirOption('modifier')}>
            <Pencil size={20} /> Modifier
          </button>
          {!options?.parDefaut && (
            <button type="button" onClick={() => choisirOption('defaut')}>
              <Star size={20} /> Définir par défaut
            </button>
          )}
          <button type="button" className="danger" onClick={() => choisirOption('supprimer')}>
            <Trash2 size={20} /> Supprimer
          </button>
        </div>
      </Modale>

      <FormulaireAdresse
        ouverte={formulaire !== null}
        onFermer={() => setFormulaire(null)}
        adresse={formulaire?.adresse ?? null}
        depuisPosition={formulaire?.depuisPosition ?? false}
        onEnregistree={actualiser}
      />
    </Page>
  );
}

/** Une adresse du carnet : icône, libellé, adresse, bouton d'options. */
function LigneAdresse({ adresse, onOptions }) {
  return (
    <div className="rangee" style={{ gap: 12, padding: 14, alignItems: 'flex-start', cursor: 'pointer' }} onClick={onOptions}>
      <span
        className="vignette"
        style={{
          background: adresse.parDefaut ? 'var(--encre)' : 'var(--surface)',
          color: adresse.parDefaut ? 'var(--blanc)' : 'var(--encre)',
        }}
      >
        <IconeAdresse libelle={adresse.libelle} size={20} />
      </span>
      <div className="extensible">
        <p className="rangee" style={{ gap: 8, fontSize: 15, fontWeight: 600 }}>
          {adresse.libelle}
          {adresse.parDefaut && (
            <span className="pastille pastille--petite" style={{ fontWeight: 700 }}>
              Par défaut
            </span>
          )}
        </p>
        <p className="texte-secondaire" style={{ fontSize: 13.5, lineHeight: 1.4, marginTop: 2 }}>
          {adresse.adresse}
        </p>
        {adresse.repere && (
          <p className="texte-discret" style={{ fontSize: 12.5 }}>
            {adresse.repere}
          </p>
        )}
      </div>
      <button
        type="button"
        className="champ__oeil"
        aria-label={`Options ${adresse.libelle}`}
        onClick={(e) => {
          e.stopPropagation();
          onOptions();
        }}
      >
        <Ellipsis size={20} />
      </button>
    </div>
  );
}
