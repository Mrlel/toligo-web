import { api } from '../../api/client';
import { Routes } from '../../commun/routes';
import { lireBooleen, lireDate, lireEntier, lireListe, lireObjet } from '../../utils/lecture';

/** Notification reçue par le client. */
function versNotification(json) {
  return {
    id: String(json.id),
    titre: json.title ?? '',
    message: json.message ?? '',
    creeLe: lireDate(json.created_at),
    lue: lireBooleen(json.isRead),
    type: json.type ?? null,
    // Écran à ouvrir : { ecran: 'suivi_colis', code_suivi: 'CL-...' }.
    cible: lireObjet(json.cible),
  };
}

/** Route de l'écran ciblé par une notification, ou null si elle n'en a pas. */
export function routeDeNotification(notification) {
  const { ecran, code_suivi: code, commande_id: commandeId, location_id: locationId } = notification.cible;
  if (ecran === 'suivi_colis' && code) return Routes.colis(code);
  if (ecran === 'preuves_colis' && code) return Routes.preuves(code);
  if (ecran === 'evaluation' && code) return Routes.colisLivre(code);
  if (ecran === 'commande' && commandeId) return Routes.commandeConfirmee(commandeId);
  if (ecran === 'box' && locationId) return Routes.boxDetail(locationId);
  return null;
}

export async function listerNotifications() {
  return lireListe(await api.get('/client/notifications')).map(versNotification);
}

export async function nombreNonLues() {
  return lireEntier(lireObjet(await api.get('/client/notifications/unread-count')).count) ?? 0;
}

export function toutLire() {
  return api.patch('/client/notifications/mark-read');
}

export function marquerLue(id) {
  return api.patch(`/client/notifications/${id}/lu`);
}
