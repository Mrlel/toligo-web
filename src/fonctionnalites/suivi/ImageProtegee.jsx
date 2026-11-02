import { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

import { Roue } from '../../composants';
import { telechargerPhoto } from './api';

/**
 * Photo stockée en privé sur le serveur (preuve, photo d'un colis) : elle est
 * téléchargée avec le jeton de connexion, puis affichée.
 */
export function ImageProtegee({ url, hauteur = 180, alt = 'Photo enregistrée par le livreur' }) {
  const [adresse, setAdresse] = useState(null);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let actif = true;
    let adresseLocale = null;
    setAdresse(null);
    setErreur(false);
    telechargerPhoto(url)
      .then((fichier) => {
        if (!actif) return;
        adresseLocale = URL.createObjectURL(fichier);
        setAdresse(adresseLocale);
      })
      .catch(() => actif && setErreur(true));
    // La photo est libérée de la mémoire quand on quitte l'écran.
    return () => {
      actif = false;
      if (adresseLocale) URL.revokeObjectURL(adresseLocale);
    };
  }, [url]);

  return (
    <div className="image-protegee" style={{ height: hauteur }}>
      {adresse && <img src={adresse} alt={alt} />}
      {!adresse && !erreur && <Roue />}
      {erreur && <ImageOff size={24} aria-label="Photo indisponible" />}
    </div>
  );
}
