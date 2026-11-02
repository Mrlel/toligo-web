import { useEffect, useState } from 'react';
import { LocateFixed, Search } from 'lucide-react';

import { ApiErreur } from '../../api/client';
import { Bouton, Champ, ChampSelection, ChampTelephone, Interrupteur, Modale, Puce, useMessages } from '../../composants';
import { useSession } from '../../session/Session';
import { afficher as afficherTelephone, normaliser, valider as validerTelephone } from '../../utils/telephone';
import { ChoixLieu } from '../lieux/ChoixLieu';
import { descriptionLieu, lieuDuPoint, positionActuelle } from '../lieux/api';
import { creerAdresse, modifierAdresse } from './api';

const SUGGESTIONS = ['Domicile', 'Bureau', 'Boutique'];

/**
 * Création ou modification d'une adresse du carnet, dans une fenêtre.
 *
 * - `adresse` : adresse à modifier ; absente pour une nouvelle adresse ;
 * - `depuisPosition` : remplit l'emplacement avec la position GPS actuelle ;
 * - `lieu` : emplacement déjà choisi avant d'ouvrir le formulaire ;
 * - `onEnregistree(adresse)` : appelé avec l'adresse enregistrée.
 */
export function FormulaireAdresse({ ouverte, onFermer, adresse = null, depuisPosition = false, lieu: lieuInitial = null, onEnregistree }) {
  const { profil, rechargerProfil } = useSession();
  const { afficherMessage, afficherErreur } = useMessages();

  const [champs, setChamps] = useState({});
  const [lieu, setLieu] = useState(null);
  const [parDefaut, setParDefaut] = useState(false);
  const [choixLieuOuvert, setChoixLieuOuvert] = useState(false);
  const [erreurs, setErreurs] = useState({});
  const [enCours, setEnCours] = useState(false);

  // À chaque ouverture : on part de l'adresse existante, ou du titulaire du compte.
  useEffect(() => {
    if (!ouverte) return;
    setErreurs({});
    if (adresse) {
      setChamps({
        libelle: adresse.libelle,
        adresse: adresse.adresse,
        repere: adresse.repere ?? '',
        nom: adresse.nomContact,
        telephone: afficherTelephone(adresse.telephone),
        instructions: adresse.instructions ?? '',
      });
      setLieu({ nom: adresse.commune?.nom ?? adresse.adresse, latitude: adresse.latitude, longitude: adresse.longitude, commune: adresse.commune });
      setParDefaut(adresse.parDefaut);
    } else {
      setChamps({
        libelle: '',
        adresse: lieuInitial ? descriptionLieu(lieuInitial) : '',
        repere: '',
        nom: profil?.nomComplet ?? '',
        telephone: profil ? afficherTelephone(profil.telephone) : '',
        instructions: '',
      });
      setLieu(lieuInitial);
      setParDefaut(false);
      if (depuisPosition) utiliserPosition();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte]);

  /** Met à jour un champ et efface son message d'erreur (le contact s'appelle nom_contact côté API). */
  const changer = (nom) => (evenement) => {
    setChamps((c) => ({ ...c, [nom]: evenement.target.value }));
    setErreurs((e) => ({ ...e, [nom === 'nom' ? 'nom_contact' : nom]: null }));
  };

  function appliquerLieu(nouveau) {
    setLieu(nouveau);
    setErreurs((e) => ({ ...e, lieu: null }));
    // L'adresse précise reprend le lieu tant que le client ne l'a pas écrite.
    setChamps((c) => (c.adresse?.trim() ? c : { ...c, adresse: descriptionLieu(nouveau) }));
  }

  async function utiliserPosition() {
    try {
      const position = await positionActuelle();
      appliquerLieu(await lieuDuPoint(position.latitude, position.longitude));
    } catch (e) {
      afficherErreur(e);
    }
  }

  async function enregistrer() {
    const locales = {
      libelle: champs.libelle.trim() ? null : 'Donnez un nom à cette adresse.',
      adresse: champs.adresse.trim() ? null : "Précisez l'adresse.",
      nom_contact: champs.nom.trim() ? null : 'Indiquez un nom.',
      telephone: validerTelephone(champs.telephone),
      lieu: lieu ? null : "Indiquez l'emplacement de l'adresse.",
    };
    setErreurs(locales);
    if (Object.values(locales).some(Boolean)) return;

    const saisie = {
      libelle: champs.libelle.trim(),
      nomContact: champs.nom.trim(),
      telephone: normaliser(champs.telephone),
      adresse: champs.adresse.trim(),
      repere: champs.repere.trim(),
      latitude: lieu.latitude,
      longitude: lieu.longitude,
      instructions: champs.instructions.trim(),
      parDefaut,
    };

    setEnCours(true);
    try {
      const enregistree = adresse ? await modifierAdresse(adresse.id, saisie) : await creerAdresse(saisie);
      rechargerProfil(); // Le nombre d'adresses du profil change.
      afficherMessage(adresse ? 'Adresse modifiée.' : 'Adresse enregistrée.');
      onEnregistree?.(enregistree);
      onFermer();
    } catch (e) {
      if (e instanceof ApiErreur) {
        setErreurs({
          libelle: e.erreurDe('libelle'),
          adresse: e.erreurDe('adresse'),
          nom_contact: e.erreurDe('nom_contact'),
          telephone: e.erreurDe('telephone'),
        });
      }
      afficherErreur(e);
    } finally {
      setEnCours(false);
    }
  }

  return (
    <Modale
      ouverte={ouverte}
      onFermer={onFermer}
      titre={adresse ? "Modifier l'adresse" : 'Nouvelle adresse'}
      large
      pied={
        <Bouton enCours={enCours} onClick={enregistrer}>
          Enregistrer l'adresse
        </Bouton>
      }
    >
      {champs.libelle !== undefined && (
        <form
          className="pile"
          style={{ gap: 18 }}
          noValidate
          onSubmit={(evenement) => {
            evenement.preventDefault();
            enregistrer();
          }}
        >
          <div>
            <Champ
              libelle="Nom de l'adresse"
              placeholder="Domicile, Bureau, Chez maman…"
              value={champs.libelle}
              onChange={changer('libelle')}
              erreur={erreurs.libelle}
            />
            <div className="rangee" style={{ gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {SUGGESTIONS.map((suggestion) => (
                <Puce
                  key={suggestion}
                  choisie={champs.libelle === suggestion}
                  onClick={() => setChamps((c) => ({ ...c, libelle: suggestion }))}
                >
                  {suggestion}
                </Puce>
              ))}
            </div>
          </div>

          <div>
            <ChampSelection
              libelle="Emplacement"
              valeur={descriptionLieu(lieu)}
              indice="Rechercher un quartier, une rue…"
              icone={Search}
              onClick={() => setChoixLieuOuvert(true)}
              erreur={erreurs.lieu}
            />
            <button type="button" className="lien lien--accent rangee" style={{ gap: 6, marginTop: 6 }} onClick={utiliserPosition}>
              <LocateFixed size={18} />
              Utiliser ma position actuelle
            </button>
          </div>

          <Champ
            libelle="Adresse précise"
            placeholder="Quartier, rue, numéro de villa"
            value={champs.adresse}
            onChange={changer('adresse')}
            erreur={erreurs.adresse}
          />
          <Champ
            libelle="Repère"
            facultatif
            placeholder="Portail bleu, face à la pharmacie"
            value={champs.repere}
            onChange={changer('repere')}
          />
          <Champ
            libelle="Personne à contacter"
            autoComplete="name"
            value={champs.nom}
            onChange={changer('nom')}
            erreur={erreurs.nom_contact}
          />
          <ChampTelephone
            libelle="Téléphone du contact"
            valeur={champs.telephone}
            onChange={(valeur) => {
              setChamps((c) => ({ ...c, telephone: valeur }));
              setErreurs((e) => ({ ...e, telephone: null }));
            }}
            erreur={erreurs.telephone}
          />
          <Champ
            libelle="Instructions pour le livreur"
            facultatif
            multiligne
            lignes={2}
            placeholder="Sonner deux fois…"
            value={champs.instructions}
            onChange={changer('instructions')}
          />

          <div className="rangee" style={{ gap: 12 }}>
            <div className="extensible">
              <p className="demi-gras">Adresse par défaut</p>
              <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
                Proposée en premier pour vos envois
              </p>
            </div>
            <Interrupteur actif={parDefaut} onChange={setParDefaut} libelle="Adresse par défaut" />
          </div>
        </form>
      )}

      <ChoixLieu ouverte={choixLieuOuvert} onFermer={() => setChoixLieuOuvert(false)} onChoisir={appliquerLieu} titre="Emplacement" />
    </Modale>
  );
}
