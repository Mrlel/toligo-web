import { Briefcase, Heart, House } from 'lucide-react';

/**
 * Icône d'une adresse selon son libellé, comme dans les maquettes : maison
 * pour le domicile, mallette pour le bureau, cœur sinon.
 */
export function IconeAdresse({ libelle, size = 19 }) {
  const nom = (libelle ?? '').toLowerCase();
  if (nom.includes('domicile') || nom.includes('maison')) return <House size={size} aria-hidden="true" />;
  if (nom.includes('bureau') || nom.includes('travail')) return <Briefcase size={size} aria-hidden="true" />;
  return <Heart size={size} aria-hidden="true" />;
}
