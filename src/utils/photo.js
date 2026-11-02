import { ApiErreur } from '../api/client';

/**
 * Photos prises avec le téléphone : souvent plusieurs Mo, alors que le serveur
 * en accepte 5 au plus (JPEG, PNG ou WebP). Avant l'envoi, la photo est
 * réduite et réenregistrée en JPEG : l'envoi est plus rapide sur mobile.
 */

/** Plus grand côté de la photo envoyée, en pixels. */
const COTE_MAX = 1600;

/** Taille maximale acceptée par le serveur (5 Mo). */
const TAILLE_MAX = 5 * 1024 * 1024;

/**
 * Renvoie la photo allégée (fichier JPEG). Si le navigateur ne sait pas la
 * lire (format HEIC hors Safari...), la photo d'origine est envoyée telle
 * quelle et le serveur dit si elle convient.
 */
export async function preparerPhoto(fichier) {
  let photo = fichier;
  try {
    const image = await createImageBitmap(fichier);
    const echelle = Math.min(1, COTE_MAX / Math.max(image.width, image.height));
    const canevas = document.createElement('canvas');
    canevas.width = Math.round(image.width * echelle);
    canevas.height = Math.round(image.height * echelle);
    canevas.getContext('2d').drawImage(image, 0, 0, canevas.width, canevas.height);
    image.close?.();

    const jpeg = await new Promise((resoudre) => canevas.toBlob(resoudre, 'image/jpeg', 0.85));
    if (jpeg) photo = new File([jpeg], 'colis.jpg', { type: 'image/jpeg' });
  } catch {
    // Image illisible par le navigateur : on garde l'original.
  }

  if (photo.size > TAILLE_MAX) {
    throw new ApiErreur('La photo ne doit pas dépasser 5 Mo.', { statut: 422 });
  }
  return photo;
}
