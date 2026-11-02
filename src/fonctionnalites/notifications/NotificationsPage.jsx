import { useNavigate } from 'react-router-dom';
import { Bell, CircleCheck, Check, CreditCard, Lock } from 'lucide-react';

import { Cascade, EnTete, IconeDrone, Page, useMessages, VueDonnees, VueVide } from '../../composants';
import { heure, jour } from '../../utils/formatage';
import { useDonnees } from '../../utils/useDonnees';
import { listerNotifications, marquerLue, routeDeNotification, toutLire } from './api';

/** Icône et couleurs d'une notification, d'après l'écran qu'elle ouvre. */
function iconeNotification(notification) {
  switch (notification.cible.ecran) {
    case 'evaluation':
      return [<Check size={21} key="i" />, 'var(--succes-clair)', 'var(--succes-fonce)'];
    case 'preuves_colis':
      return [<CircleCheck size={21} key="i" />, 'var(--surface-alt)', 'var(--encre)'];
    case 'box':
      return [<Lock size={21} key="i" />, 'var(--accent-clair)', 'var(--accent-fonce)'];
    case 'commande':
      return [<CreditCard size={21} key="i" />, 'var(--surface)', 'var(--encre)'];
    case 'suivi_colis':
      return [<IconeDrone taille={21} key="i" />, 'var(--accent-clair)', 'var(--accent-fonce)'];
    default:
      return [<Bell size={21} key="i" />, 'var(--surface)', 'var(--encre)'];
  }
}

/** Maquette A-Notifications, regroupées par jour. */
export default function NotificationsPage() {
  const naviguer = useNavigate();
  const { afficherErreur } = useMessages();
  const notifications = useDonnees(listerNotifications, []);

  async function toutMarquerLu() {
    try {
      await toutLire();
      notifications.recharger();
    } catch (erreur) {
      afficherErreur(erreur);
    }
  }

  async function ouvrir(notification) {
    if (!notification.lue) {
      try {
        await marquerLue(notification.id);
      } catch {
        // Sans gravité : la notification restera simplement « non lue ».
      }
    }
    const route = routeDeNotification(notification);
    if (route) naviguer(route);
    else notifications.recharger();
  }

  return (
    <Page
      titre="Notifications"
      largeur="moyenne"
      entete={
        <EnTete
          titre="Notifications"
          actionsLarges
          actions={
            <button type="button" className="lien" onClick={toutMarquerLu}>
              Tout lire
            </button>
          }
        />
      }
    >
      <VueDonnees etat={notifications}>
        {(liste) => {
          if (liste.length === 0) return <VueVide titre="Aucune notification" icone={Bell} />;

          // Regroupement par jour : « AUJOURD'HUI », « HIER », « MERCREDI 8 OCTOBRE ».
          const groupes = [];
          liste.forEach((notification) => {
            const libelle = notification.creeLe ? jour(notification.creeLe) : '';
            if (groupes.length === 0 || groupes[groupes.length - 1].libelle !== libelle) groupes.push({ libelle, elements: [] });
            groupes[groupes.length - 1].elements.push(notification);
          });

          return groupes.map((groupe, g) => (
            <section key={`${groupe.libelle}-${g}`} style={{ marginTop: g === 0 ? 4 : 16 }}>
              {groupe.libelle && (
                <p className="etiquette-section" style={{ fontSize: 13, letterSpacing: 0.6, marginBottom: 12 }}>
                  {groupe.libelle}
                </p>
              )}
              <Cascade className="pile" style={{ gap: 4 }}>
                {groupe.elements.map((notification) => (
                  <LigneNotification key={notification.id} notification={notification} onClick={() => ouvrir(notification)} />
                ))}
              </Cascade>
            </section>
          ));
        }}
      </VueDonnees>
    </Page>
  );
}

function LigneNotification({ notification, onClick }) {
  const [icone, fond, couleur] = iconeNotification(notification);
  return (
    <button
      type="button"
      className="option option--plate"
      style={{
        alignItems: 'flex-start',
        border: 0,
        padding: 12,
        background: notification.lue ? 'transparent' : 'var(--surface-selection)',
      }}
      onClick={onClick}
    >
      <span className="vignette" style={{ background: fond, color: couleur }}>
        {icone}
      </span>
      <span className="extensible">
        <span style={{ display: 'block', fontSize: 14.5, fontWeight: notification.lue ? 600 : 700 }}>{notification.titre}</span>
        <span className="texte-secondaire" style={{ display: 'block', fontSize: 13, lineHeight: 1.4, marginTop: 2 }}>
          {notification.message}
        </span>
      </span>
      <span className="pile" style={{ alignItems: 'flex-end', gap: 6 }}>
        <span className="texte-secondaire" style={{ fontSize: 12 }}>
          {heure(notification.creeLe)}
        </span>
        {!notification.lue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} aria-label="Non lue" />}
      </span>
    </button>
  );
}
