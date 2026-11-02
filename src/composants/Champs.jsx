import { useId, useState } from 'react';
import { Check, ChevronRight, Eye, EyeOff } from 'lucide-react';

import { filtrerSaisie } from '../utils/telephone';

/** Libellé au-dessus d'un champ, suivi d'une précision en gris (« (facultatif) »). */
export function Libelle({ htmlFor, children, precision }) {
  return (
    <label className="champ__libelle" htmlFor={htmlFor}>
      {children}
      {precision && <span className="champ__precision"> ({precision})</span>}
    </label>
  );
}

/**
 * Champ de saisie avec son libellé au-dessus, comme dans les maquettes.
 *
 * - `erreur` : message affiché sous le champ (erreur locale ou du serveur) ;
 * - `multiligne` : zone de texte au lieu d'une ligne ;
 * - `bordee` : fond blanc bordé de gris au lieu du fond gris ;
 * - `suffixe` : élément posé à droite dans le champ.
 *
 * Les autres propriétés (value, onChange, placeholder, type...) vont au champ.
 */
export function Champ({
  libelle,
  facultatif = false,
  precision,
  erreur,
  aide,
  multiligne = false,
  lignes = 3,
  bordee = false,
  suffixe,
  className = '',
  classeSaisie = '',
  ...saisie
}) {
  const id = useId();
  const classes = ['champ__saisie'];
  if (erreur) classes.push('champ__saisie--erreur');
  if (bordee) classes.push('champ__saisie--bordee');
  if (suffixe) classes.push('champ__saisie--avec-suffixe');
  if (classeSaisie) classes.push(classeSaisie);

  const proprietes = {
    id,
    className: classes.join(' '),
    'aria-invalid': erreur ? true : undefined,
    'aria-describedby': erreur ? `${id}-erreur` : aide ? `${id}-aide` : undefined,
    ...saisie,
  };

  return (
    <div className={`champ ${className}`}>
      {libelle && (
        <Libelle htmlFor={id} precision={facultatif ? 'facultatif' : precision}>
          {libelle}
        </Libelle>
      )}
      <div className="champ__zone">
        {multiligne ? <textarea rows={lignes} {...proprietes} /> : <input {...proprietes} />}
        {suffixe && <div className="champ__suffixe">{suffixe}</div>}
      </div>
      {erreur && (
        <p className="champ__erreur" id={`${id}-erreur`}>
          {erreur}
        </p>
      )}
      {!erreur && aide && (
        <p className="champ__aide" id={`${id}-aide`}>
          {aide}
        </p>
      )}
    </div>
  );
}

/**
 * Champ de téléphone, précédé d'une case grise « +225 ».
 *
 * La saisie reste libre (« 07 08 12 34 56 ») : utiliser `normaliser()` de
 * utils/telephone avant l'envoi à l'API.
 */
export function ChampTelephone({ libelle = 'Numéro de téléphone', valeur, onChange, erreur, aide, ...reste }) {
  const id = useId();
  return (
    <div className="champ">
      {libelle && <Libelle htmlFor={id}>{libelle}</Libelle>}
      <div className="champ__zone">
        <span className="champ__prefixe" aria-hidden="true">
          +225
        </span>
        <input
          id={id}
          className={`champ__saisie${erreur ? ' champ__saisie--erreur' : ''}`}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="07 08 12 34 56"
          value={valeur}
          onChange={(e) => onChange(filtrerSaisie(e.target.value))}
          aria-invalid={erreur ? true : undefined}
          {...reste}
        />
      </div>
      {erreur && <p className="champ__erreur">{erreur}</p>}
      {!erreur && aide && <p className="champ__aide">{aide}</p>}
    </div>
  );
}

/** Champ mot de passe avec bouton « afficher ». `suffixe` remplace ce bouton. */
export function ChampMotDePasse({ libelle = 'Mot de passe', suffixe, ...reste }) {
  const [masque, setMasque] = useState(true);

  const oeil = (
    <button
      type="button"
      className="champ__oeil"
      onClick={() => setMasque(!masque)}
      aria-label={masque ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
      title={masque ? 'Afficher le mot de passe' : 'Masquer le mot de passe'}
    >
      {masque ? <Eye size={20} /> : <EyeOff size={20} />}
    </button>
  );

  return (
    <Champ
      libelle={libelle}
      type={masque ? 'password' : 'text'}
      classeSaisie={masque ? 'champ__saisie--motdepasse' : ''}
      suffixe={suffixe ?? oeil}
      {...reste}
    />
  );
}

/** Champ « cliquable » qui ouvre un sélecteur (lieu, date...). */
export function ChampSelection({ libelle, valeur, indice, onClick, icone: Icone = ChevronRight, erreur }) {
  const vide = !valeur;
  return (
    <div className="champ">
      {libelle && <span className="champ__libelle">{libelle}</span>}
      <button
        type="button"
        className={`champ-selection${vide ? ' champ-selection--vide' : ''}${erreur ? ' champ-selection--erreur' : ''}`}
        onClick={onClick}
      >
        <span className="extensible">{vide ? indice : valeur}</span>
        <Icone size={20} aria-hidden="true" />
      </button>
      {erreur && <p className="champ__erreur">{erreur}</p>}
    </div>
  );
}

/** Interrupteur (on / off). */
export function Interrupteur({ actif, onChange, libelle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      className="interrupteur"
      onClick={(evenement) => {
        evenement.stopPropagation();
        onChange(!actif);
      }}
    />
  );
}

/** Case à cocher noire des maquettes. */
export function CaseACocher({ cochee }) {
  return (
    <span className={`case${cochee ? ' case--cochee' : ''}`} aria-hidden="true">
      {cochee && <Check size={15} strokeWidth={3} />}
    </span>
  );
}
