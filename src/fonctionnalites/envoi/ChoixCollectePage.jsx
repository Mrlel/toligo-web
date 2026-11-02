import { useState } from 'react';
import { Marker } from 'react-leaflet';
import { ChevronRight, LocateFixed, Plus, Search } from 'lucide-react';

import { Bouton, Cascade, EnTete, Option, Page, PiedDAction, useRetour, VueDonnees } from '../../composants';
import { CarteOsm, iconeEpingle } from '../../commun/carte';
import { Routes } from '../../commun/routes';
import { useDonnees } from '../../utils/useDonnees';
import { listerAdresses } from '../adresses/api';
import { FormulaireAdresse } from '../adresses/FormulaireAdresse';
import { IconeAdresse } from '../adresses/IconeAdresse';
import { ChoixLieu } from '../lieux/ChoixLieu';
import { useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Maquette A-Envoi-Domicile : choix de l'adresse de l'expéditeur dans le carnet,
 * ou création d'une nouvelle adresse (recherche ou position actuelle).
 */
export default function ChoixCollectePage() {
  const retour = useRetour(Routes.envoi);
  const { brouillon, choisirCollecte } = useEnvoi();
  const adresses = useDonnees(listerAdresses, []);

  const [choisie, setChoisie] = useState(brouillon.collecte?.id ?? null);
  const [rechercheOuverte, setRechercheOuverte] = useState(false);
  // Formulaire d'adresse : null (fermé) ou ses paramètres { adresse, lieu, depuisPosition }.
  const [formulaire, setFormulaire] = useState(null);

  const liste = adresses.donnees ?? [];
  const adresseChoisie = liste.find((a) => a.id === choisie) ?? null;

  /** Une adresse créée ou modifiée devient l'adresse choisie. */
  function surAdresseEnregistree(adresse) {
    adresses.recharger();
    setChoisie(adresse.id);
  }

  return (
    <Page
      titre="Votre adresse"
      entete={<EnTete titre="Votre adresse" gris repli={Routes.envoi} />}
      pied={
        <PiedDAction arrondi>
          <Bouton
            disabled={!adresseChoisie}
            onClick={() => {
              choisirCollecte(adresseChoisie);
              retour();
            }}
          >
            Envoyer depuis cette adresse
          </Bouton>
        </PiedDAction>
      }
    >
      <VueDonnees etat={adresses}>
        {() => (
          <>
            <button type="button" className="faux-champ-recherche" onClick={() => setRechercheOuverte(true)}>
              <Search size={20} />
              Rechercher un quartier, une rue…
            </button>

            <button type="button" className="ligne-action" style={{ marginTop: 10 }} onClick={() => setFormulaire({ depuisPosition: true })}>
              <span className="rond-icone rond-icone--accent">
                <LocateFixed size={19} />
              </span>
              <span className="extensible">Utiliser ma position actuelle</span>
              <ChevronRight size={20} color="var(--texte-secondaire)" />
            </button>

            {adresseChoisie && (
              <div className="apercu-carte" style={{ marginTop: 14 }}>
                <CarteOsm key={adresseChoisie.id} centre={[adresseChoisie.latitude, adresseChoisie.longitude]} zoom={15} fixe>
                  <Marker position={[adresseChoisie.latitude, adresseChoisie.longitude]} icon={iconeEpingle()} />
                </CarteOsm>
                <span className="apercu-carte__etiquette">
                  <IconeAdresse libelle={adresseChoisie.libelle} size={14} />
                  {adresseChoisie.commune ? `${adresseChoisie.libelle} · ${adresseChoisie.commune.nom}` : adresseChoisie.libelle}
                </span>
                <button type="button" className="apercu-carte__bouton" onClick={() => setFormulaire({ adresse: adresseChoisie })}>
                  Ajuster le repère
                </button>
              </div>
            )}

            <p className="etiquette-section" style={{ margin: '18px 0 8px' }}>
              Mes adresses
            </p>
            {liste.length === 0 && (
              <p className="texte-secondaire" style={{ fontSize: 13 }}>
                Aucune adresse enregistrée : ajoutez votre domicile ou votre bureau.
              </p>
            )}
            <Cascade className="pile" style={{ gap: 8 }}>
              {liste.map((adresse) => (
                <Option key={adresse.id} choisie={adresse.id === choisie} onClick={() => setChoisie(adresse.id)}>
                  <div className="rangee" style={{ gap: 12 }}>
                    <span className={`rond-icone${adresse.id === choisie ? ' rond-icone--noir' : ''}`}>
                      <IconeAdresse libelle={adresse.libelle} />
                    </span>
                    <div className="extensible">
                      <p className="rangee" style={{ gap: 6, fontSize: 15, fontWeight: 600 }}>
                        {adresse.libelle}
                        {adresse.parDefaut && <span className="pastille-defaut">Par défaut</span>}
                      </p>
                      <p className="texte-secondaire" style={{ fontSize: 13 }}>
                        {adresse.adresse}
                      </p>
                    </div>
                  </div>
                </Option>
              ))}
            </Cascade>

            <button type="button" className="lien lien--accent rangee" style={{ gap: 6, marginTop: 10, paddingLeft: 0 }} onClick={() => setFormulaire({})}>
              <Plus size={18} />
              Nouvelle adresse
            </button>
          </>
        )}
      </VueDonnees>

      {/* Recherche d'abord le lieu, puis complète l'adresse dans le formulaire. */}
      <ChoixLieu
        ouverte={rechercheOuverte}
        onFermer={() => setRechercheOuverte(false)}
        titre="Votre adresse"
        onChoisir={(lieu) => setFormulaire({ lieu })}
      />
      <FormulaireAdresse
        ouverte={formulaire !== null}
        onFermer={() => setFormulaire(null)}
        adresse={formulaire?.adresse ?? null}
        lieu={formulaire?.lieu ?? null}
        depuisPosition={formulaire?.depuisPosition ?? false}
        onEnregistree={surAdresseEnregistree}
      />
    </Page>
  );
}
