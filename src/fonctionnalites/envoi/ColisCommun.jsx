import { Wine } from 'lucide-react';

import { Carte, Champ, Illustration, Interrupteur } from '../../composants';
import { illustrationDuFormat, tailleIllustrationFormat } from '../../commun/formats';

/**
 * Morceaux communs aux écrans « Colis » et « Ajouter un colis ».
 */

/**
 * Illustration d'un format dans sa vignette grise de 62 px (blanche une fois
 * le format choisi). Petit, moyen et grand n'ont pas la même taille d'image.
 */
export function VignetteFormat({ format }) {
  return (
    <span className="vignette-format">
      <Illustration nom={illustrationDuFormat(format.icone, format.code)} taille={tailleIllustrationFormat(format.code)} />
    </span>
  );
}

/** Champ « Que contient le colis ? ». */
export function ChampDescriptionColis({ valeur, onChange }) {
  return (
    <Champ
      libelle="Que contient le colis ?"
      placeholder="Documents et un chargeur de téléphone"
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

/** Carte « Colis fragile » avec son interrupteur. */
export function CarteFragile({ valeur, onChange }) {
  return (
    <Carte onClick={() => onChange(!valeur)} style={{ padding: '10px 14px' }}>
      <div className="rangee" style={{ gap: 12 }}>
        <span className="rond-icone">
          <Wine size={20} />
        </span>
        <div className="extensible">
          <p className="demi-gras" style={{ fontSize: 14.5 }}>
            Colis fragile
          </p>
          <p className="texte-secondaire" style={{ fontSize: 12.5 }}>
            Manipulation avec précaution
          </p>
        </div>
        <Interrupteur actif={valeur} onChange={onChange} libelle="Colis fragile" />
      </div>
    </Carte>
  );
}
