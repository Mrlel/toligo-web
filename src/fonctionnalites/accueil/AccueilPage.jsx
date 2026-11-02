import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Bell, Lock, Search, Truck } from 'lucide-react';

import {
  AvatarInitiales,
  BarreProgression,
  BlocGris,
  BoutonRond,
  Carte,
  Cascade,
  IconeDrone,
  Page,
  Pastille,
  Roue,
  VueErreur,
} from '../../composants';
import { Routes } from '../../commun/routes';
import { useSession } from '../../session/Session';
import { dateHeure, distance, prenom, prix } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { adresseParDefaut, listerAdresses } from '../adresses/api';
import { boxLouees, entrepotsProches, tousLesEntrepots } from '../box/api';
import { nombreNonLues } from '../notifications/api';
import { libelleStatutColis, listerEnvois } from '../suivi/api';
import { detailAction, ouvrirColis } from '../suivi/EnvoisPage';
import './accueil.css';

/**
 * Entrepôts proposés sur l'accueil : les plus proches de l'adresse par
 * défaut du client (sans demander la position GPS), sinon tous.
 */
async function chargerEntrepotsAccueil() {
  const reference = adresseParDefaut(await listerAdresses());
  if (!reference) return tousLesEntrepots();
  const proches = await entrepotsProches(reference.latitude, reference.longitude);
  return proches.length > 0 ? proches : tousLesEntrepots();
}

/** Maquette Main : accueil du client. */
export default function AccueilPage() {
  const naviguer = useNavigate();
  const { profil } = useSession();
  const [recherche, setRecherche] = useState('');

  const nonLues = useDonnees(nombreNonLues, []);
  const envois = useDonnees(() => listerEnvois('en_cours'), []);
  const boxes = useDonnees(boxLouees, []);
  const entrepots = useDonnees(chargerEntrepotsAccueil, []);

  const boxActive = boxes.donnees?.find((b) => b.statut === 'active');

  function suivre(evenement) {
    evenement.preventDefault();
    const code = recherche.trim().toUpperCase();
    if (code) naviguer(Routes.colis(code));
  }

  return (
    <Page titre="Accueil" largeur="large">
      <div className="accueil__entete">
        <AvatarInitiales nom={profil?.nomComplet} />
        <div className="extensible">
          <p className="accueil__bonjour">Bonjour,</p>
          <p className="titre accueil__nom">{profil?.nomComplet ?? ' '}</p>
        </div>
        <span className="bouton-cloche">
          <BoutonRond icone={Bell} libelle="Notifications" onClick={() => naviguer(Routes.notifications)} />
          {nonLues.donnees > 0 && <span className="bouton-cloche__point" aria-label={`${nonLues.donnees} non lues`} />}
        </span>
      </div>

      <form className="recherche-suivi" onSubmit={suivre} role="search">
        <Search size={20} aria-hidden="true" />
        <label htmlFor="recherche-suivi" className="invisible">
          Numéro de suivi
        </label>
        <input
          id="recherche-suivi"
          type="text"
          placeholder="Suivre un colis — ex. CL-261012-4F7K2Q"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" aria-label="Suivre">
          <ArrowRight size={20} />
        </button>
      </form>

      <div className="raccourcis">
        <Link to={Routes.envoi} className="raccourci">
          <img src="/illustrations/camion.png" alt="" className="raccourci__camion" />
          <span className="raccourci__titre">Envoyer un colis</span>
          <span className="raccourci__fleche">
            <ArrowUpRight size={14} />
          </span>
        </Link>
        <Link to={Routes.entrepots} className="raccourci">
          <img src="/illustrations/coffre.png" alt="" className="raccourci__coffre" />
          <span className="raccourci__titre">Louer un box</span>
          <span className="raccourci__fleche">
            <ArrowUpRight size={14} />
          </span>
        </Link>
      </div>

      <div className="accueil__colonnes">
        <section>
          <div className="titre-section">
            <h2>En cours</h2>
            <Link to={Routes.envois} className="lien">
              Tout voir
            </Link>
          </div>

          {envois.erreur && <VueErreur erreur={envois.erreur} onReessayer={envois.recharger} />}
          {!envois.erreur && envois.donnees === undefined && (
            <div style={{ padding: 16, textAlign: 'center' }}>
              <Roue />
            </div>
          )}
          {envois.donnees && envois.donnees.colis.length === 0 && (
            <BlocGris>
              <p className="texte-secondaire" style={{ fontSize: 13 }}>
                Aucun envoi en cours.
              </p>
            </BlocGris>
          )}
          <Cascade className="grille">
            {envois.donnees?.colis.slice(0, 4).map((colis) => (
              <CarteColisAccueil key={colis.codeSuivi} colis={colis} />
            ))}
            {boxActive && <CarteBoxAccueil key="box" box={boxActive} />}
          </Cascade>
        </section>

        {entrepots.donnees?.length > 0 && (
          <section>
            <div className="titre-section">
              <h2>Entrepôts près de vous</h2>
              <Link to={Routes.entrepots} className="lien">
                Carte
              </Link>
            </div>
            <div className="entrepots-proches">
              {entrepots.donnees.slice(0, 6).map((entrepot) => (
                <CarteEntrepotAccueil key={entrepot.id} entrepot={entrepot} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Page>
  );
}

/** Envoi en cours : « CL-... · pour Mariam », étape actuelle, « 4/6 » et barre. */
function CarteColisAccueil({ colis }) {
  const naviguer = useNavigate();
  const sousTitre = detailAction(colis) ?? colis.jalonCourant ?? libelleStatutColis(colis.statut);
  // Liaison par drone en cours (jalon « En vol vers ... ») : icône de drone ; sinon le camion.
  const enVol = colis.statut === 'en_transit_aerien' && (colis.jalonCourant ?? '').startsWith('En vol');

  return (
    <Carte onClick={() => ouvrirColis(naviguer, colis)}>
      <div className="carte-colis-accueil__haut">
        <span className="carte-colis-accueil__icone">
          {enVol ? <IconeDrone taille={21} /> : <Truck size={21} />}
        </span>
        <div className="extensible">
          <p className="carte-colis-accueil__titre une-ligne">
            {colis.codeSuivi} · pour {prenom(colis.destinataireNom)}
          </p>
          <p className="carte-colis-accueil__detail une-ligne">{sousTitre}</p>
        </div>
        <Pastille ton="accent">
          {colis.progression.position}/{colis.progression.total}
        </Pastille>
      </div>
      <div style={{ marginTop: 10 }}>
        <BarreProgression valeur={colis.progression.ratio} />
      </div>
    </Carte>
  );
}

/** Box louée : « BOX-0142 · Riviera Palmeraie », code prêt, bouton « Code ». */
function CarteBoxAccueil({ box }) {
  const naviguer = useNavigate();
  return (
    <Carte onClick={() => naviguer(Routes.boxDetail(box.locationId))}>
      <div className="carte-colis-accueil__haut">
        <span className="carte-colis-accueil__icone" style={{ background: 'var(--accent-clair)', color: 'var(--accent-fonce)' }}>
          <Lock size={21} />
        </span>
        <div className="extensible">
          <p className="carte-colis-accueil__titre une-ligne">
            BOX-{box.numero ?? ''} · {box.entrepotNom ?? ''}
          </p>
          <p className="carte-colis-accueil__detail une-ligne">
            {box.code ? `Code prêt · jusqu'à ${dateHeure(box.expireLe)}` : 'Code en préparation'}
          </p>
        </div>
        <span className="bouton-code">
          <Lock size={14} />
          Code
        </span>
      </div>
    </Carte>
  );
}

/** Entrepôt proche : nom, commune et distance, box libres, prix de départ. */
function CarteEntrepotAccueil({ entrepot }) {
  const lieu = [entrepot.commune ?? entrepot.localite, entrepot.distanceKm !== null ? distance(entrepot.distanceKm) : null]
    .filter(Boolean)
    .join(' · ');

  return (
    <Link to={Routes.boxObjet(entrepot.id)} state={{ entrepot }} className="carte-entrepot-accueil">
      <div>
        <p className="une-ligne" style={{ fontSize: 14.5, fontWeight: 700 }}>
          {entrepot.nom}
        </p>
        {lieu && (
          <p className="texte-secondaire" style={{ fontSize: 13 }}>
            {lieu}
          </p>
        )}
      </div>
      <div className="rangee" style={{ gap: 8 }}>
        {entrepot.nbBoxLibres !== null && (
          <span className="pastille-libres">
            {entrepot.nbBoxLibres} box libre{entrepot.nbBoxLibres > 1 ? 's' : ''}
          </span>
        )}
        <span className="extensible" />
        {entrepot.prixMinHeure !== null && (
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>dès {prix(entrepot.prixMinHeure)}/h</span>
        )}
      </div>
    </Link>
  );
}
