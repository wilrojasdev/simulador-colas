import type { CSSProperties } from 'react';

/** Tonos de piel para que la sala se vea poblada por gente distinta. */
export const PIELES = ['#f1d0b0', '#e0b48c', '#c68b5e', '#9a6440', '#6e4428'];

const RELLENO = { fila: 'var(--color-senal)', atendido: 'var(--color-tinta)', personal: 'var(--color-gris)' } as const;
const TINTA = 'var(--color-tinta)';

/**
 * Una persona vista de frente. Mientras `andando` es true mueve las piernas y se balancea
 * (con CSS, para que corra fuera del hilo principal). Amarillo = en la fila, tinta = siendo atendida.
 */
export function Figura({
  cuerpo,
  piel,
  numero,
  andando = false,
  ritmo = 0.36,
  className,
}: {
  cuerpo: keyof typeof RELLENO;
  piel: string;
  numero?: string;
  andando?: boolean;
  /** duración de un paso, en segundos */
  ritmo?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 40"
      aria-hidden
      className={`persona ${andando ? 'andando' : ''} ${className ?? ''}`}
      style={{ '--ritmo': `${ritmo}s` } as CSSProperties}
    >
      <rect className="pierna pierna-a" x="7" y="26" width="4.2" height="12.5" rx="2.1" style={{ fill: TINTA }} />
      <rect className="pierna pierna-b" x="12.8" y="26" width="4.2" height="12.5" rx="2.1" style={{ fill: TINTA }} />
      <g className="torso">
        <rect
          x="3.5"
          y="12.5"
          width="17"
          height="17"
          rx="6"
          style={{ fill: RELLENO[cuerpo], stroke: TINTA }}
          strokeWidth="1.4"
          className="relleno"
        />
        <circle cx="12" cy="6.9" r="5.3" style={{ fill: piel, stroke: TINTA }} strokeWidth="1.4" />
        {numero && (
          <text
            x="12"
            y="24.2"
            textAnchor="middle"
            fontSize="7.6"
            fontWeight="700"
            fontFamily="Barlow Condensed, sans-serif"
            style={{ fill: cuerpo === 'atendido' ? 'var(--color-papel)' : cuerpo === 'fila' ? 'var(--color-sobresenal)' : TINTA }}
          >
            {numero}
          </text>
        )}
      </g>
    </svg>
  );
}
