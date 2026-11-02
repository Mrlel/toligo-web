import { Lock, MapPin, Plane } from 'lucide-react';

/**
 * Illustrations des maquettes A-Bienvenue, A-Onboard-Colis et A-Onboard-Box,
 * utilisées par la page publique, la connexion et l'inscription (styles :
 * styles/scenes.css).
 *
 * Chaque scène est un cadre arrondi aux proportions de la maquette
 * (350 × 356) : les positions sont en pourcentage, la scène garde donc le
 * même dessin à toutes les tailles (téléphone ou grand écran).
 */

/** Étiquette posée sur l'illustration : « Le ciel, plus vite ». */
function Puce({ libelle, icone: Icone, sombre = false, inclinee = false, style }) {
  return (
    <span className={`scene__puce${sombre ? ' scene__puce--sombre' : ''}${Icone ? '' : ' scene__puce--point'}`} style={style}>
      {Icone ? (
        <span className="scene__puce-icone" style={inclinee ? { transform: 'rotate(45deg)' } : undefined}>
          <Icone size={14} />
        </span>
      ) : (
        <span className="scene__puce-point" />
      )}
      {libelle}
    </span>
  );
}

/** Image d'illustration placée en pourcentage du cadre. */
function Image({ nom, style }) {
  return <img className="scene__image" src={`/illustrations/${nom}.png`} alt="" style={style} draggable={false} />;
}

/** A-Bienvenue : le ciel (parachute) et la route (camion). */
export function SceneCielRoute() {
  return (
    <div className="scene" style={{ background: 'var(--surface)' }}>
      <svg className="scene__decor" viewBox="0 0 350 356" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="262" cy="96" r="92" fill="#fff" />
        <path d="M150 204 C160 160 190 134 236 150" stroke="#E86A2A" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeDasharray="2 9" />
        <path d="M0 306 C90 286 220 296 350 280 L350 356 L0 356 Z" fill="#EAEAEC" />
      </svg>
      <Image nom="parachute" style={{ top: '5.6%', right: '4.6%', width: '45.7%' }} />
      <Image nom="camion" style={{ left: '2.9%', bottom: '7.3%', width: '67.4%' }} />
      <Puce libelle="Le ciel, plus vite" icone={Plane} inclinee style={{ top: '9.6%', left: '6.3%' }} />
      <Puce libelle="La route, partout" icone={MapPin} sombre style={{ top: '21.3%', left: '6.3%' }} />
    </div>
  );
}

/** A-Onboard-Colis : trois formats de colis. */
export function SceneColis() {
  return (
    <div className="scene" style={{ background: 'var(--accent-clair)' }}>
      <svg className="scene__decor" viewBox="0 0 350 356" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="175" cy="150" r="118" fill="#FFF7F1" />
        <ellipse cx="175" cy="272" rx="150" ry="18" fill="rgba(244, 201, 174, 0.55)" />
      </svg>
      <Image nom="colis-petit" style={{ left: '6.3%', bottom: '23%', width: '24%' }} />
      <Image nom="colis-moyen" style={{ left: '28.6%', bottom: '22.5%', width: '33.7%' }} />
      <Image nom="colis-grand" style={{ right: '4.6%', bottom: '21.9%', width: '40%' }} />
      <div className="scene__formats">
        <span className="scene__format">
          Petit <small>2 kg</small>
        </span>
        <span className="scene__format">
          Moyen <small>5 kg</small>
        </span>
        <span className="scene__format scene__format--sombre">
          Grand <small>10 kg</small>
        </span>
      </div>
      <Puce libelle="Prix fixé à la commande" style={{ top: '6.7%', left: '6.3%' }} />
    </div>
  );
}

/** A-Onboard-Box : une étagère, un coffre et le code PIN. */
export function SceneBox() {
  return (
    <div className="scene" style={{ background: 'var(--surface)' }}>
      <svg className="scene__decor" viewBox="0 0 350 356" preserveAspectRatio="none" aria-hidden="true">
        <circle cx="150" cy="150" r="120" fill="#fff" />
        <ellipse cx="175" cy="300" rx="150" ry="16" fill="#EAEAEC" />
      </svg>
      <Image nom="etagere" style={{ left: '9.7%', bottom: '12.9%', width: '56%' }} />
      <Image nom="coffre" style={{ right: '6.3%', bottom: '11.8%', width: '36.6%' }} />
      <div className="scene__pin" style={{ top: '6.2%', right: '5.1%' }}>
        <span className="scene__pin-icone">
          <Lock size={16} />
        </span>
        <span>
          <small>Votre code PIN</small>
          <strong>482 7193</strong>
        </span>
      </div>
    </div>
  );
}
