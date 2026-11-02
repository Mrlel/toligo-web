import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, Check, Clock, House, KeyRound, MapPin, Package, Truck, Warehouse } from 'lucide-react';

import { Bouton, IconeDrone } from '../../composants';
import { Routes } from '../../commun/routes';
import { SceneBox, SceneCielRoute, SceneColis } from '../../commun/Scenes';
import './vitrine.css';

/**
 * Page publique de Tôligo (adresse « / ») : présentation des deux services,
 * puis inscription ou connexion.
 *
 * Elle reprend les textes et les illustrations des anciens écrans de
 * bienvenue (maquettes A-Bienvenue, A-Onboard-Colis, A-Onboard-Box). Un
 * client déjà connecté qui ouvre « / » arrive directement sur son accueil
 * (RoutesPubliques, dans App.jsx).
 */

// Chaque bloc apparaît en montant légèrement quand on l'atteint en défilant.
const APPARITION = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.2, 0, 0, 1] },
};

// Haut de page : les éléments arrivent l'un après l'autre au chargement.
const CASCADE = { visible: { transition: { staggerChildren: 0.08 } } };
const ELEMENT = {
  cache: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.2, 0, 0, 1] } },
};

const ETAPES_COLIS = [
  ['Choisissez un format', 'Petit, Moyen ou Grand : le prix est fixé dès la commande.'],
  ['Déposez-le dans un box', 'Un box Tôligo près de chez vous, ouvert avec un code reçu par SMS.'],
  ['Il passe par nos stations', 'Ramassé par notre camion, puis acheminé par la route ou par drone.'],
  ['Suivez-le en direct', 'Retrait en station, livraison à domicile ou box : vous choisissez.'],
];

// Trajet d'un colis : des arrêts, reliés par la route ou par le ciel.
const TRAJET = [
  { arret: 'Box de dépôt', detail: 'Près de chez vous', icone: Package },
  { liaison: 'Camion' },
  { arret: 'Station de départ', detail: 'Le colis est pesé', icone: MapPin },
  { liaison: 'Drone', ciel: true },
  { arret: "Station d'arrivée", detail: 'Près du destinataire', icone: MapPin },
  { liaison: 'Route' },
  { arret: 'Remise', detail: 'Retrait, domicile ou box', icone: House },
];

const ATOUTS_BOX = [
  [Clock, "À l'heure", 'Quelques heures ou plusieurs jours, selon votre besoin.'],
  [MapPin, 'Près de chez vous', "Choisissez l'entrepôt le plus proche sur la carte."],
  [KeyRound, 'Code PIN', 'Reçu sur votre téléphone, il ouvre votre box.'],
];

/** Lien d'en-tête vers une section : défilement en douceur, sans changer d'écran. */
function allerA(evenement, id) {
  evenement.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function VitrinePage() {
  const naviguer = useNavigate();
  const inscription = () => naviguer(Routes.inscription);
  const connexion = () => naviguer(Routes.connexion);

  useEffect(() => {
    document.title = 'Tôligo : colis et box de stockage à Abidjan';
  }, []);

  return (
    <div className="vitrine">
      {/* --- En-tête --- */}
      <header className="vitrine__entete">
        <div className="vitrine__limite vitrine__barre">
          <Link to={Routes.vitrine} className="vitrine__logo">
            Tôligo<span>.</span>
          </Link>
          <nav className="vitrine__nav" aria-label="Sections de la page">
            <a href="#colis" onClick={(e) => allerA(e, 'colis')}>
              Envoyer un colis
            </a>
            <a href="#trajet" onClick={(e) => allerA(e, 'trajet')}>
              Le ciel et la route
            </a>
            <a href="#box" onClick={(e) => allerA(e, 'box')}>
              Louer un box
            </a>
          </nav>
          <div className="vitrine__acces">
            <Bouton variante="secondaire" compact onClick={connexion}>
              Se connecter
            </Bouton>
            <Bouton compact onClick={inscription}>
              Créer un compte
            </Bouton>
          </div>
        </div>
      </header>

      <main>
        {/* --- Haut de page (A-Bienvenue) --- */}
        <section className="vitrine__limite vitrine__heros">
          <motion.div initial="cache" animate="visible" variants={CASCADE}>
            <motion.p className="vitrine__pastille" variants={ELEMENT}>
              <span className="vitrine__pastille-icone">
                <MapPin size={13} />
              </span>
              Colis et box de stockage, à Abidjan
            </motion.p>
            <motion.h1 className="vitrine__titre" variants={ELEMENT}>
              Avec Tôligo, nous utilisons <span className="texte-accent">le ciel</span> pour aller plus vite et{' '}
              <span className="texte-accent">la route</span> pour aller partout.
            </motion.h1>
            <motion.p className="vitrine__chapeau" variants={ELEMENT}>
              Livraison de colis et box de stockage sécurisés, à Abidjan.
            </motion.p>
            <motion.div className="vitrine__boutons" variants={ELEMENT}>
              <Bouton onClick={inscription}>Créer un compte</Bouton>
              <Bouton variante="secondaire" onClick={connexion}>
                J'ai déjà un compte
              </Bouton>
            </motion.div>
            <motion.ul className="vitrine__atouts" variants={ELEMENT}>
              {['Prix fixé à la commande', 'Suivi en direct', 'Box ouvert par code PIN'].map((atout) => (
                <li key={atout}>
                  <span className="vitrine__coche">
                    <Check size={13} strokeWidth={3} />
                  </span>
                  {atout}
                </li>
              ))}
            </motion.ul>
          </motion.div>

          <motion.div
            className="vitrine__heros-visuel"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, ease: [0.2, 0, 0, 1], delay: 0.15 }}
          >
            {/* L'illustration flotte doucement. */}
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
              <SceneCielRoute />
            </motion.div>
          </motion.div>
        </section>

        {/* --- Envoi de colis (A-Onboard-Colis) --- */}
        <section id="colis" className="vitrine__section">
          <div className="vitrine__limite vitrine__deux-colonnes">
            <motion.div className="vitrine__visuel" {...APPARITION}>
              <SceneColis />
            </motion.div>
            <motion.div {...APPARITION}>
              <p className="vitrine__etiquette">
                <Package size={16} /> Envoi de colis
              </p>
              <h2 className="vitrine__sous-titre">Envoyez un colis en quelques gestes</h2>
              <p className="vitrine__texte">
                Choisissez un format, un livreur vient le chercher. Votre colis passe par nos stations, par la route ou par drone, et
                vous le suivez en direct.
              </p>
              <ol className="vitrine__etapes">
                {ETAPES_COLIS.map(([titre, detail]) => (
                  <li key={titre} className="vitrine__etape">
                    <div>
                      <strong>{titre}</strong>
                      <span>{detail}</span>
                    </div>
                  </li>
                ))}
              </ol>
              <div className="vitrine__action">
                <Bouton icone={ArrowRight} onClick={inscription}>
                  Envoyer un colis
                </Bouton>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- Le ciel et la route : le trajet d'un colis --- */}
        <section id="trajet" className="vitrine__section vitrine__section--serree">
          <div className="vitrine__limite">
            <motion.div className="vitrine__nuit" {...APPARITION}>
              <div className="vitrine__nuit-entete">
                <p className="vitrine__etiquette">Le ciel et la route</p>
                <h2 className="vitrine__sous-titre">Le bon chemin pour chaque colis</h2>
                <p className="vitrine__texte">
                  Vous déposez votre colis dans un box Tôligo ; notre camion l'apporte à une station. Entre deux stations, il
                  voyage par drone ou par la route, puis il est remis à votre destinataire.
                </p>
              </div>

              <motion.ol
                className="trajet"
                initial="cache"
                whileInView="visible"
                viewport={{ once: true, margin: '-60px' }}
                variants={{ visible: { transition: { staggerChildren: 0.14, delayChildren: 0.2 } } }}
              >
                {TRAJET.map((etape, i) =>
                  etape.arret ? (
                    <motion.li key={i} className="trajet__arret" variants={ELEMENT}>
                      <span className="trajet__rond">
                        <etape.icone size={22} />
                      </span>
                      <strong>{etape.arret}</strong>
                      <span className="trajet__detail">{etape.detail}</span>
                    </motion.li>
                  ) : (
                    <motion.li
                      key={i}
                      className={`trajet__liaison${etape.ciel ? ' trajet__liaison--ciel' : ''}`}
                      variants={{ cache: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.4 } } }}
                    >
                      <span className="trajet__mode">
                        {etape.ciel ? <IconeDrone taille={15} /> : <Truck size={15} />}
                        {etape.liaison}
                      </span>
                    </motion.li>
                  ),
                )}
              </motion.ol>

              <div className="vitrine__duo">
                <div className="carte-nuit">
                  <span className="carte-nuit__icone">
                    <Truck size={20} />
                  </span>
                  <h3>La route, partout</h3>
                  <p>Nos camions ramassent les colis dans les box ; nos livreurs les apportent à domicile.</p>
                </div>
                <div className="carte-nuit carte-nuit--ciel">
                  <span className="carte-nuit__icone">
                    <IconeDrone taille={20} />
                  </span>
                  <h3>Le ciel, plus vite</h3>
                  <p>Entre deux stations, quand la distance le permet, le colis voyage par drone : il arrive plus vite.</p>
                </div>
              </div>
              <p className="vitrine__note">
                <Check size={16} strokeWidth={3} /> Même prix par la route ou par drone : il dépend seulement du format.
              </p>
            </motion.div>
          </div>
        </section>

        {/* --- Box de stockage (A-Onboard-Box) --- */}
        <section id="box" className="vitrine__section">
          <div className="vitrine__limite vitrine__deux-colonnes vitrine__deux-colonnes--inverse">
            <motion.div className="vitrine__visuel" {...APPARITION}>
              <SceneBox />
            </motion.div>
            <motion.div {...APPARITION}>
              <p className="vitrine__etiquette">
                <Warehouse size={16} /> Box de stockage
              </p>
              <h2 className="vitrine__sous-titre">Louez un box de stockage sécurisé</h2>
              <p className="vitrine__texte">
                Réservez à l'heure dans un entrepôt proche de chez vous. Vous ouvrez votre box avec un code PIN reçu sur votre
                téléphone.
              </p>
              <ul className="vitrine__atouts-box">
                {ATOUTS_BOX.map(([Icone, titre, detail]) => (
                  <li key={titre} className="atout">
                    <span className="atout__icone">
                      <Icone size={18} />
                    </span>
                    <strong>{titre}</strong>
                    <span>{detail}</span>
                  </li>
                ))}
              </ul>
              <div className="vitrine__action">
                <Bouton icone={ArrowRight} onClick={inscription}>
                  Louer un box
                </Bouton>
              </div>
            </motion.div>
          </div>
        </section>

        {/* --- Dernier appel --- */}
        <section className="vitrine__section vitrine__section--serree">
          <div className="vitrine__limite">
            <motion.div className="vitrine__appel" {...APPARITION}>
              <img className="vitrine__appel-image" src="/illustrations/parachute.png" alt="" draggable={false} />
              <div>
                <h2 className="vitrine__sous-titre">Prêt à envoyer votre premier colis ?</h2>
                <p className="vitrine__texte">Créez votre compte avec votre numéro de téléphone : un code reçu par SMS suffit à le confirmer.</p>
              </div>
              <div className="vitrine__boutons vitrine__boutons--appel">
                <Bouton onClick={inscription}>Créer un compte</Bouton>
                <Bouton variante="contour" onClick={connexion}>
                  J'ai déjà un compte
                </Bouton>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* --- Pied de page --- */}
      <footer className="vitrine__pied">
        <div className="vitrine__limite vitrine__pied-contenu">
          <div>
            <Link to={Routes.vitrine} className="vitrine__logo">
              Tôligo<span>.</span>
            </Link>
            <p>Livraison de colis et box de stockage sécurisés, à Abidjan.</p>
          </div>
          <nav className="vitrine__pied-liens" aria-label="Accès au compte">
            <Link to={Routes.connexion}>Se connecter</Link>
            <Link to={Routes.inscription}>Créer un compte</Link>
          </nav>
          <p className="vitrine__copyright">© {new Date().getFullYear()} Tôligo · Abidjan, Côte d'Ivoire</p>
        </div>
      </footer>
    </div>
  );
}
