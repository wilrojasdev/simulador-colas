import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import type { ModeloId, Parametros, Resultado } from '../lib/colas';
import type { Unidad } from '../lib/formato';
import { pasos } from '../lib/pasos';
import { MODELOS } from '../modelos';
import { Formula, SALIDA } from './Basicos';

interface Props {
  modelo: ModeloId;
  params: Parametros;
  resultado: Resultado;
  unidad: Unidad;
}

const variantes = {
  entra: (dir: number) => ({ x: dir * 24, opacity: 0 }),
  centro: { x: 0, opacity: 1 },
  sale: (dir: number) => ({ x: dir * -24, opacity: 0 }),
};

export function PasoAPaso({ modelo, params, resultado, unidad }: Props) {
  const [actual, setActual] = useState(0);
  const [dir, setDir] = useState(1);
  const [todos, setTodos] = useState(false);
  const lista = resultado.tipo === 'ok' ? pasos(modelo, params, resultado, unidad) : [];
  const indice = actual < lista.length ? actual : 0;

  const ir = (n: number) => {
    if (n < 0 || n >= lista.length || n === indice) return;
    setDir(n > indice ? 1 : -1);
    setActual(n);
  };

  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    if (todos) return;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      ir(indice - 1);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      ir(indice + 1);
    }
  };

  const paso = lista[indice];

  return (
    <div onKeyDown={teclas}>
      <div>
        <h2 className="font-cond text-3xl font-bold leading-none sm:text-4xl">Cálculo paso a paso</h2>
        <p className="mt-2 text-suave">
          Las fórmulas de {MODELOS[modelo].nombre} con tus números, en el orden en que se calculan.
        </p>
      </div>

      {lista.length === 0 ? (
        <p className="py-6 text-suave">
          {resultado.tipo === 'inestable'
            ? 'Con ρ ≥ 100 % las fórmulas no aplican: la fila crece sin límite.'
            : 'Escribe valores válidos para ver el cálculo.'}
        </p>
      ) : (
        <>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setTodos((t) => !t)}
              className="text-sm text-suave underline underline-offset-4 hover:text-tinta"
            >
              {todos ? 'Ver un paso a la vez' : 'Ver todos a la vez'}
            </button>
          </div>

          {todos ? (
            <ol className="grid gap-x-10 lg:grid-cols-2">
              {lista.map((p, i) => (
                <li key={`${modelo}-${p.titulo}`} className="flex gap-4 border-b border-linea py-5">
                  <span className="w-8 shrink-0 font-cond text-3xl font-bold leading-none text-tinta/30">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold">{p.titulo}</h3>
                    <p className="text-sm text-suave">{p.explicacion}</p>
                    <Formula tex={p.formula} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <>
              <div className="panel mt-2 overflow-hidden p-6 sm:p-10">
                <AnimatePresence mode="wait" custom={dir} initial={false}>
                  <motion.div
                    key={`${modelo}-${indice}-${paso.titulo}`}
                    custom={dir}
                    variants={variantes}
                    initial="entra"
                    animate="centro"
                    exit="sale"
                    transition={{ duration: 0.22, ease: SALIDA }}
                    className="min-h-48"
                  >
                    <p className="font-cond text-lg font-semibold text-suave">
                      Paso {indice + 1} de {lista.length}
                    </p>
                    <h3 className="mt-1 font-cond text-2xl font-bold sm:text-3xl">{paso.titulo}</h3>
                    <p className="mt-2 text-suave">{paso.explicacion}</p>
                    <div className="mt-6 text-xl">
                      <Formula tex={paso.formula} />
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  onClick={() => ir(indice - 1)}
                  disabled={indice === 0}
                  className="tecla pulsable flex items-center gap-2 rounded-lg border border-linea bg-pared px-4 py-2 font-semibold text-tinta disabled:opacity-40"
                >
                  <ArrowLeft className="size-5" /> Anterior
                </button>
                <div className="order-first flex w-full flex-wrap items-center justify-center gap-1 sm:order-none sm:w-auto">
                  {lista.map((p, i) => (
                    <button
                      key={`${modelo}-${p.titulo}`}
                      onClick={() => ir(i)}
                      aria-label={`Ir al paso ${i + 1}`}
                      aria-current={i === indice ? 'step' : undefined}
                      className={`relative grid size-8 place-items-center rounded-full text-sm font-semibold ${
                        i === indice ? 'text-sobresenal' : 'text-suave hover:text-tinta'
                      }`}
                    >
                      {i === indice && (
                        <motion.span
                          layoutId="paso-actual"
                          transition={{ duration: 0.22, ease: SALIDA }}
                          className="absolute inset-0 rounded-full bg-senal"
                        />
                      )}
                      <span className="relative">{i + 1}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => ir(indice + 1)}
                  disabled={indice === lista.length - 1}
                  className="tecla pulsable flex items-center gap-2 rounded-lg border border-linea bg-senal px-4 py-2 font-semibold text-sobresenal disabled:opacity-40"
                >
                  Siguiente <ArrowRight className="size-5" />
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
