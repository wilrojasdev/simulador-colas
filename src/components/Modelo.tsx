import { Check, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import type { ModeloId } from '../lib/colas';
import type { ConfigSim } from '../lib/simulacion';
import { KENDALL, MODELOS, ORDEN } from '../modelos';
import { SALIDA } from './Basicos';
import { MiniFila } from './MiniFila';

const RESORTE = { type: 'spring', stiffness: 500, damping: 40 } as const;

/** Filas de muestra para cada tarjeta: el mismo ritmo de llegadas, distinta forma de atender. */
const MUESTRA: Record<ModeloId, { conf: ConfigSim; ritmo: number }> = {
  mm1: { conf: { lambda: 0.75, mu: 1, servidores: 1, dist: 'exp', sigma: 0 }, ritmo: 0.45 },
  md1: { conf: { lambda: 0.75, mu: 1, servidores: 1, dist: 'det', sigma: 0 }, ritmo: 0.45 },
  mms: { conf: { lambda: 2.2, mu: 1, servidores: 3, dist: 'exp', sigma: 0 }, ritmo: 0.95 },
  mg1: { conf: { lambda: 0.7, mu: 1, servidores: 1, dist: 'gen', sigma: 1.3 }, ritmo: 0.42 },
};

/**
 * Las cuatro tarjetas grandes del inicio. Cada una tiene su fila en miniatura funcionando, para
 * que la diferencia entre modelos se vea antes de leerla.
 */
export function TarjetasModelo({ modelo, onCambio }: { modelo: ModeloId; onCambio: (m: ModeloId) => void }) {
  return (
    <div role="radiogroup" aria-label="Modelo de colas" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {ORDEN.map((id, i) => {
        const m = MODELOS[id];
        const activo = id === modelo;
        return (
          <motion.button
            key={id}
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(id)}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: SALIDA, delay: 0.05 + i * 0.07 } }}
            whileHover={{ y: -4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2, ease: SALIDA }}
            className={`elevada relative flex flex-col overflow-hidden rounded-2xl border-2 p-5 text-left ${
              activo ? 'border-tinta text-sobresenal' : 'border-linea bg-papel text-tinta hover:border-tinta/40'
            }`}
          >
            {activo && <motion.span layoutId="modelo-activo" className="absolute inset-0 bg-senal" transition={RESORTE} />}
            <span className="relative flex items-start justify-between gap-3">
              <span>
                <span className="block font-cond text-4xl font-bold leading-none sm:text-5xl">{m.nombre}</span>
                <span className={`mt-1 block text-sm font-semibold ${activo ? '' : 'text-suave'}`}>{m.titulo}</span>
              </span>
              <AnimatePresence initial={false}>
                {activo && (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', duration: 0.35, bounce: 0.35 }}
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-sobresenal text-senal"
                  >
                    <Check aria-hidden size={18} strokeWidth={3} />
                  </motion.span>
                )}
              </AnimatePresence>
            </span>
            <MiniFila
              conf={MUESTRA[id].conf}
              ritmo={MUESTRA[id].ritmo}
              alto={60}
              etiqueta={`Animación de una fila ${m.nombre}`}
              className="relative my-4 w-full"
            />
            <span className={`relative mt-auto block text-sm ${activo ? 'font-medium' : 'text-suave'}`}>{m.resumen}</span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** "¿Qué significan las letras?": la notación de Kendall, plegada para no recargar el inicio. */
export function LetrasModelo({ modelo }: { modelo: ModeloId }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <div className="mt-6">
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="pulsable group flex items-center gap-2 text-sm font-semibold text-suave hover:text-tinta"
      >
        ¿Qué significan las letras de {MODELOS[modelo].nombre}?
        <motion.span animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2, ease: SALIDA }} className="grid">
          <ChevronDown aria-hidden size={16} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: SALIDA }}
            className="overflow-hidden"
          >
            <Kendall modelo={modelo} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SelectorModelo({
  modelo,
  onCambio,
  compacto = false,
}: {
  modelo: ModeloId;
  onCambio: (m: ModeloId) => void;
  /** para espacios angostos (el panel de ajustes): siempre dos columnas */
  compacto?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="Modelo de colas" className={`grid grid-cols-2 gap-2 ${compacto ? '' : 'sm:grid-cols-4'}`}>
      {ORDEN.map((id) => {
        const m = MODELOS[id];
        const activo = id === modelo;
        return (
          <button
            key={id}
            role="radio"
            aria-checked={activo}
            onClick={() => onCambio(id)}
            className={`pulsable relative overflow-hidden elevada rounded-xl border-2 px-4 py-3 text-left ${
              activo ? 'border-tinta text-sobresenal' : 'border-linea bg-papel hover:border-tinta/40'
            }`}
          >
            {activo && (
              <motion.span
                layoutId="modelo-activo"
                className="absolute inset-0 bg-senal"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
            <span className={`relative block font-cond font-bold leading-none ${compacto ? 'text-2xl' : 'text-3xl sm:text-4xl'}`}>
              {m.nombre}
            </span>
            <span className={`relative mt-1 block text-sm font-medium ${activo ? 'text-sobresenal' : 'text-suave'}`}>
              {m.titulo}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Qué significa cada letra del nombre del modelo. */
export function Kendall({ modelo }: { modelo: ModeloId }) {
  const letras = MODELOS[modelo].letras;
  return (
    <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-3">
      {KENDALL.map((k, i) => (
        <div key={k.etiqueta} className="flex items-start gap-3">
          <dt className="relative grid h-11 w-9 shrink-0 place-items-center overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={letras[i]}
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.2, ease: SALIDA }}
                className="font-cond text-4xl font-bold"
              >
                {letras[i]}
              </motion.span>
            </AnimatePresence>
          </dt>
          <dd className="text-sm">
            <span className="font-semibold">{k.etiqueta}.</span>{' '}
            <span className="text-suave">{k.letras[letras[i]]}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
