import katex from 'katex';
import { animate, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

/** Curva de salida rápida: arranca con energía y se asienta suave. */
export const SALIDA = [0.23, 1, 0.32, 1] as const;

/** Número que se acomoda rápido a su nuevo valor (corto, para no estorbar al mover un deslizador). */
export function NumeroAnimado({
  valor,
  formato,
  className,
}: {
  valor: number;
  formato: (n: number) => string;
  className?: string;
}) {
  const [mostrado, setMostrado] = useState(valor);
  const actual = useRef(valor);
  useEffect(() => {
    if (!Number.isFinite(valor) || !Number.isFinite(actual.current)) {
      actual.current = valor;
      setMostrado(valor);
      return;
    }
    const control = animate(actual.current, valor, {
      duration: 0.3,
      ease: SALIDA,
      onUpdate: (v) => {
        actual.current = v;
        setMostrado(v);
      },
    });
    return () => control.stop();
  }, [valor]);
  return <span className={className}>{formato(mostrado)}</span>;
}

/** Fórmula en LaTeX. El texto lo arma el propio programa a partir de números. */
export function Formula({ tex, enLinea = false }: { tex: string; enLinea?: boolean }) {
  const html = useMemo(
    () => katex.renderToString(tex, { throwOnError: false, displayMode: !enLinea }),
    [tex, enLinea],
  );
  return enLinea ? <span dangerouslySetInnerHTML={{ __html: html }} /> : <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export function TituloSeccion({ titulo, subtitulo, extra }: { titulo: string; subtitulo?: string; extra?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div>
        <h2 className="font-cond text-3xl font-bold leading-none sm:text-4xl">{titulo}</h2>
        {subtitulo && <p className="mt-2 text-suave">{subtitulo}</p>}
      </div>
      {extra}
    </div>
  );
}

/** Botones de opción con un resaltado que se desliza entre ellos. */
export function Segmentado<T extends string | number>({
  opciones,
  valor,
  onCambio,
  id,
  etiqueta,
  oscuro = false,
}: {
  opciones: { valor: T; texto: string }[];
  valor: T;
  onCambio: (v: T) => void;
  id: string;
  etiqueta: string;
  oscuro?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={etiqueta}
      className={`inline-flex rounded-lg border p-0.5 ${oscuro ? 'border-white/15 bg-white/5' : 'border-linea bg-pared'}`}
    >
      {opciones.map((o) => {
        const activo = o.valor === valor;
        return (
          <button
            key={String(o.valor)}
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(o.valor)}
            className={`pulsable relative rounded-md px-3 py-1 text-sm font-semibold ${
              activo
                ? oscuro
                  ? 'text-sobresenal'
                  : 'text-papel'
                : oscuro
                  ? 'text-papel/70 hover:text-papel'
                  : 'text-suave hover:text-tinta'
            }`}
          >
            {activo && (
              <motion.span
                layoutId={`segmentado-${id}`}
                className={`absolute inset-0 rounded-md ${oscuro ? 'bg-senal' : 'bg-tinta'}`}
                transition={{ type: 'spring', stiffness: 550, damping: 40 }}
              />
            )}
            <span className="relative">{o.texto}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Número de turno con tres cifras: 7 → "007". */
export function turno(n: number): string {
  return String(n % 1000).padStart(3, '0');
}
