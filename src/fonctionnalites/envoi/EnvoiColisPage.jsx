import { Navigate, useNavigate } from 'react-router-dom';
import { Minus, Plus } from 'lucide-react';

import { BarreEtapes, Bouton, Cascade, EnTete, Page, PiedDAction, VueDonnees } from '../../composants';
import { dimensionsLisibles, listerFormats, poidsLisible } from '../../commun/formats';
import { Routes } from '../../commun/routes';
import { prenom } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { CarteTarif, fourchetteLisible } from './ColisCommun';
import { etapesEnvoi, fourchetteDesFormats, NB_MAX_COLIS, useEnvoi } from './EtatEnvoi';
import './envoi.css';

/**
 * Étape « Colis » (mise à jour du 26/11/2026) : le client annonce seulement le
 * nombre de colis. Il ne choisit plus de format.
 *
 * Au dépôt, le gestionnaire de l'entrepôt pèse et mesure chaque colis : le
 * format et le prix réel en découlent. La grille affichée ici n'est qu'une
 * indication, pour que le client sache à quoi s'attendre.
 */
export default function EnvoiColisPage() {
  const naviguer = useNavigate();
  const { brouillon, definirNbColis } = useEnvoi();
  const formats = useDonnees(listerFormats, []);

  const destinataire = brouillon.destinataires[0];
  if (!destinataire || !brouillon.collecte) return <Navigate to={Routes.envoi} replace />;

  const { nbColis } = brouillon;
  const fourchette = fourchetteDesFormats(formats.donnees, nbColis);

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
                {nbColis} colis · estimation
              </span>
              <span className="titre" style={{ fontSize: 18 }}>
                {fourchette ? fourchetteLisible(fourchette) : '—'}
              </span>
            </>
          }
        >
          <Bouton onClick={() => naviguer(Routes.envoiDepot)}>Continuer</Bouton>
        </PiedDAction>
      }
    >
      <BarreEtapes etapes={etapesEnvoi(brouillon)} courante={1} />
      <h2 className="envoi__question" style={{ marginTop: 12 }}>
        Combien de colis envoyez-vous ?
      </h2>
      <p className="envoi__sous-titre">Pour {prenom(destinataire.nom)}</p>

      <div className="compteur-colis" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="compteur-colis__bouton"
          onClick={() => definirNbColis(nbColis - 1)}
          disabled={nbColis <= 1}
          aria-label="Un colis de moins"
        >
          <Minus size={22} />
        </button>
        <label className="compteur-colis__centre">
          <input
            className="compteur-colis__valeur"
            type="number"
            inputMode="numeric"
            min={1}
            max={NB_MAX_COLIS}
            value={nbColis}
            onChange={(e) => definirNbColis(Number(e.target.value))}
            aria-label="Nombre de colis"
          />
          <span className="compteur-colis__unite">colis</span>
        </label>
        <button
          type="button"
          className="compteur-colis__bouton"
          onClick={() => definirNbColis(nbColis + 1)}
          disabled={nbColis >= NB_MAX_COLIS}
          aria-label="Un colis de plus"
        >
          <Plus size={22} />
        </button>
      </div>

      <p className="etiquette-section" style={{ margin: '22px 0 10px', fontSize: 13, letterSpacing: 0.6 }}>
        Prix par colis
      </p>
      <VueDonnees etat={formats}>
        {(liste) => (
          <Cascade className="grille-tarifs">
            {liste.map((format) => (
              <CarteTarif
                key={format.id}
                format={format}
                poids={poidsLisible(format.poidsMaxKg)}
                dimensions={dimensionsLisibles(format.dimensions)}
                montant={format.prix}
              />
            ))}
          </Cascade>
        )}
      </VueDonnees>

      <p className="envoi__note">Format et prix final fixés à la pesée, au dépôt.</p>
    </Page>
  );
}
