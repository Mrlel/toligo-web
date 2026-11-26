import { Illustration } from '../../composants';
import { illustrationDuFormat, tailleIllustrationFormat } from '../../commun/formats';
import { prix } from '../../utils/formatage';

/**
 * Morceaux des écrans « Colis » (grille indicative des formats) et
 * « Récapitulatif » (fourchette de prix).
 */

/**
 * Illustration d'un format dans sa vignette grise de 62 px. Petit, moyen et
 * grand n'ont pas la même taille d'image.
 */
export function VignetteFormat({ format }) {
  return (
    <span className="vignette-format">
      <Illustration nom={illustrationDuFormat(format.icone, format.code)} taille={tailleIllustrationFormat(format.code)} />
    </span>
  );
}

/** « 1 500 – 4 500 F », ou un seul montant quand les deux bornes sont égales. */
export function fourchetteLisible({ min, max }) {
  if (min === max) return prix(min);
  // prix() se termine par « F » : on ne l'écrit qu'une fois.
  return `${prix(min).replace(/\s*F$/, '')} – ${prix(max)}`;
}

/**
 * Une carte de la grille, posée à côté des autres (Petit · Moyen · Grand) :
 * vignette du format, prix d'un colis, puis poids et dimensions maximum.
 */
export function CarteTarif({ format, poids, dimensions, montant }) {
  return (
    <div className="carte-tarif">
      <VignetteFormat format={format} />
      <p className="carte-tarif__libelle">{format.libelle}</p>
      <p className="carte-tarif__prix">{prix(montant)}</p>
      <p className="carte-tarif__unite">par colis</p>
      {(poids || dimensions) && (
        <p className="carte-tarif__detail">
          {poids}
          {poids && dimensions && <br />}
          {dimensions}
        </p>
      )}
    </div>
  );
}
