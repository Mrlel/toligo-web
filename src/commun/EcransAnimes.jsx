import { useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from 'motion/react';
import {
  UNSAFE_LocationContext as ContexteAdresse,
  UNSAFE_NavigationContext as ContexteNavigation,
  useLocation,
  useNavigationType,
  useOutlet,
} from 'react-router-dom';

import { ROUTES_ONGLETS } from './routes';

/**
 * Décalage horizontal pour les transitions entre les écrans.
 */
const DECALAGE = 40; // px parcourus par l'écran qui arrive

const ENTREE = { duration: 0.24, ease: [0.2, 0, 0, 1] };
const SORTIE = { duration: 0.12, ease: [0.4, 0, 1, 1] };

// `sens` : 'avant', 'arriere' ou 'fondu'. L'écran sortant reçoit le sens de
// la navigation qui le remplace (via `custom` d'AnimatePresence).
const variantes = {
  cache: (sens) => ({ opacity: 0, x: sens === 'avant' ? DECALAGE : sens === 'arriere' ? -DECALAGE : 0 }),
  visible: { opacity: 1, x: 0, transition: ENTREE },
  parti: (sens) => ({
    opacity: 0,
    x: sens === 'avant' ? -DECALAGE / 2 : sens === 'arriere' ? DECALAGE / 2 : 0,
    transition: SORTIE,
  }),
};

function sensTransition(cheminPrecedent, chemin, typeNavigation) {
  if (ROUTES_ONGLETS.includes(cheminPrecedent) && ROUTES_ONGLETS.includes(chemin)) return 'fondu';
  // POP : retour arrière (bouton retour de l'application ou du navigateur).
  return typeNavigation === 'POP' ? 'arriere' : 'avant';
}

export default function EcransAnimes() {
  const adresse = useLocation();
  const typeNavigation = useNavigationType();
  const ecran = useOutlet();
  const animationsReduites = useReducedMotion();

  // Sens de la transition, calculé une seule fois à chaque changement d'écran.
  const [transition, setTransition] = useState({ chemin: adresse.pathname, sens: 'avant' });
  if (transition.chemin !== adresse.pathname) {
    setTransition({ chemin: adresse.pathname, sens: sensTransition(transition.chemin, adresse.pathname, typeNavigation) });
  }
  const sens = animationsReduites ? 'fondu' : transition.sens;

  return (
    <AnimatePresence mode="wait" initial={false} custom={sens} onExitComplete={() => window.scrollTo(0, 0)}>
      <motion.div key={adresse.pathname} custom={sens} variants={variantes} initial="cache" animate="visible" exit="parti">
        <EcranFige adresse={adresse} typeNavigation={typeNavigation}>
          {ecran}
        </EcranFige>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Pendant son animation de sortie, un écran reste tel qu'il était :
 * - il garde son adresse : sinon il lirait déjà celle du nouvel écran, et un
 *   écran qui attend des données dans l'adresse (le numéro pour la saisie du
 *   code, la recherche pour le choix de box...) redirigerait ;
 * - il ne peut plus changer d'écran : une redirection déclenchée pendant ces
 *   quelques millisecondes (brouillon vidé...) serait sinon suivie.
 */
function EcranFige({ adresse, typeNavigation, children }) {
  const present = useIsPresent();
  const navigation = useContext(ContexteNavigation);

  const adresseFigee = useMemo(() => ({ location: adresse, navigationType: typeNavigation }), [adresse, typeNavigation]);
  const navigationBloquee = useMemo(
    () => ({ ...navigation, navigator: { ...navigation.navigator, push() {}, replace() {}, go() {} } }),
    [navigation],
  );

  return (
    <ContexteAdresse.Provider value={adresseFigee}>
      <ContexteNavigation.Provider value={present ? navigation : navigationBloquee}>{children}</ContexteNavigation.Provider>
    </ContexteAdresse.Provider>
  );
}
