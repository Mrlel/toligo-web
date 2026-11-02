import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, House, Package, Plus, User } from 'lucide-react';

import { AvatarInitiales, Bouton, IconeBox } from '../composants';
import { nombreNonLues } from '../fonctionnalites/notifications/api';
import { useSession } from '../session/Session';
import { afficher as afficherTelephone } from '../utils/telephone';
import EcransAnimes from './EcransAnimes';
import { Routes, ROUTES_ONGLETS } from './routes';

/**
 * Cadre des écrans du client connecté.
 *
 * - Sur ordinateur : barre de navigation à gauche, toujours visible.
 * - Sur téléphone : onglets en bas (Accueil, Envois, Mes box, Profil), sur
 *   les quatre écrans principaux seulement, comme l'application mobile.
 */
const ONGLETS = [
  { vers: Routes.accueil, libelle: 'Accueil', libelleLong: 'Accueil', icone: House },
  { vers: Routes.envois, libelle: 'Envois', libelleLong: 'Mes envois', icone: Package },
  { vers: Routes.mesBox, libelle: 'Mes box', libelleLong: 'Mes box', icone: IconeBox },
  { vers: Routes.profil, libelle: 'Profil', libelleLong: 'Profil', icone: User },
];

export default function Coquille() {
  const { pathname } = useLocation();
  const avecOnglets = ROUTES_ONGLETS.includes(pathname);

  // Chaque nouvel écran arrive avec une transition et s'ouvre en haut de page.
  return (
    <div className={`coquille${avecOnglets ? ' coquille--avec-onglets' : ''}`}>
      <BarreLaterale />
      <div className="coquille__contenu">
        <EcransAnimes />
      </div>
      {avecOnglets && <OngletsBas />}
    </div>
  );
}

/** Navigation de gauche (ordinateur). */
function BarreLaterale() {
  const naviguer = useNavigate();
  const { pathname } = useLocation();
  const { profil } = useSession();
  const [nonLues, setNonLues] = useState(0);

  // Pastille des notifications non lues, relue à chaque changement d'écran.
  useEffect(() => {
    let actif = true;
    nombreNonLues()
      .then((nombre) => actif && setNonLues(nombre))
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [pathname]);

  return (
    <nav className="barre-laterale" aria-label="Navigation principale">
      <Link to={Routes.accueil} className="barre-laterale__logo">
        Tôligo<span>.</span>
      </Link>
      <Bouton icone={Plus} className="barre-laterale__nouvel-envoi" onClick={() => naviguer(Routes.envoi)}>
        Nouvel envoi
      </Bouton>
      {ONGLETS.map(({ vers, libelleLong, icone: Icone }) => (
        <NavLink key={vers} to={vers} className="barre-laterale__lien">
          <Icone size={21} />
          {libelleLong}
        </NavLink>
      ))}
      <NavLink to={Routes.notifications} className="barre-laterale__lien">
        <Bell size={21} />
        Notifications
        {nonLues > 0 && <span className="barre-laterale__compteur">{nonLues > 99 ? '99+' : nonLues}</span>}
      </NavLink>

      <div className="barre-laterale__bas">
        <Link to={Routes.profil} className="barre-laterale__profil">
          <AvatarInitiales nom={profil?.nomComplet} taille={40} />
          <span className="extensible">
            <span className="une-ligne" style={{ display: 'block', fontWeight: 700, fontSize: 14 }}>
              {profil?.nomComplet ?? ' '}
            </span>
            <span className="une-ligne texte-secondaire" style={{ display: 'block', fontSize: 12.5 }}>
              {profil ? `+225 ${afficherTelephone(profil.telephone)}` : ''}
            </span>
          </span>
        </Link>
      </div>
    </nav>
  );
}

/** Onglets du bas (téléphone). Icônes au trait : l'onglet actif est plus foncé. */
function OngletsBas() {
  return (
    <nav className="onglets-bas" aria-label="Navigation principale">
      {ONGLETS.map(({ vers, libelle, icone: Icone }) => (
        <NavLink key={vers} to={vers} className="onglets-bas__onglet">
          {({ isActive }) => (
            <>
              <Icone size={22} strokeWidth={isActive ? 2.2 : 1.8} />
              {libelle}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
