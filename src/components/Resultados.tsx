import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import type { ModeloId, Parametros, Resultado, ResultadoInestable, ResultadoOk } from '../lib/colas';
import { duracionLegible, num, pct, tiempo, UNIDADES, type Unidad } from '../lib/formato';
import { NumeroAnimado, SALIDA } from './Basicos';
import { Figura, PIELES } from './Persona';

interface Props {
  modelo: ModeloId;
  params: Parametros;
  resultado: Resultado;
  unidad: Unidad;
}

const CAMBIO = { duration: 0.2, ease: SALIDA } as const;

export function Resultados({ modelo, params, resultado, unidad }: Props) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {resultado.tipo === 'invalido' ? (
        <motion.div key="invalido" {...aparecer} className="panel p-6 text-suave">
          {resultado.mensaje}
        </motion.div>
      ) : resultado.tipo === 'inestable' ? (
        <motion.div key="inestable" {...aparecer}>
          <Inestable modelo={modelo} params={params} r={resultado} unidad={unidad} />
        </motion.div>
      ) : (
        <motion.div key="ok" {...aparecer}>
          <Estable modelo={modelo} r={resultado} unidad={unidad} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const aparecer = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  transition: CAMBIO,
};

function Estable({ modelo, r, unidad }: { modelo: ModeloId; r: ResultadoOk; unidad: Unidad }) {
  const u = UNIDADES[unidad].corta;
  const aMin = (v: number) => (unidad === 'h' ? v * 60 : v);
  const [abierto, setAbierto] = useState(false);
  const quien = modelo === 'mms' ? 'Cada servidor está ocupado' : 'El servidor está ocupado';
  return (
    <div className="panel overflow-hidden">
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-3 lg:gap-6">
        <Respuesta titulo="Cada cliente espera en la fila" contexto="Tiempo promedio antes de empezar a ser atendido.">
          <span className="font-cond text-5xl font-bold leading-none sm:text-6xl">{tiempo(r.Wq, unidad).legible}</span>
        </Respuesta>
        <Respuesta titulo="Personas en la fila, en promedio" contexto="Sin contar a quien ya está siendo atendido.">
          <NumeroAnimado valor={r.Lq} formato={(v) => num(v, 2)} className="font-cond text-5xl font-bold leading-none sm:text-6xl" />
        </Respuesta>
        <Respuesta titulo={quien} contexto={`Libre el ${pct(1 - r.rho)} del tiempo.`}>
          <NumeroAnimado valor={r.rho} formato={(v) => pct(v)} className="font-cond text-5xl font-bold leading-none sm:text-6xl" />
        </Respuesta>
      </div>

      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="group flex w-full items-center justify-between gap-4 border-t border-linea px-6 py-3 text-left font-semibold sm:px-8"
      >
        Ver todas las medidas
        <motion.span
          animate={{ rotate: abierto ? 180 : 0 }}
          transition={{ duration: 0.2, ease: SALIDA }}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-linea bg-papel group-hover:border-tinta"
        >
          <ChevronDown className="size-5" />
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
      <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <Medida titulo="Ocupación" simbolo={<i>ρ</i>} valor={r.rho} formato={(v) => pct(v)} pie={`libre el ${pct(1 - r.rho)}`} />
        <Medida titulo="En el sistema" simbolo={<i>L</i>} valor={r.L} formato={(v) => num(v, 2)} pie="clientes, en promedio" />
        <Medida
          titulo="En la fila"
          simbolo={<><i>L</i><sub>q</sub></>}
          valor={r.Lq}
          formato={(v) => num(v, 2)}
          pie="clientes esperando"
          resaltado
        />
        <Medida
          titulo="Tiempo total"
          simbolo={<i>W</i>}
          valor={r.W}
          formato={(v) => num(v, 3)}
          unidad={u}
          pie={`≈ ${duracionLegible(aMin(r.W))}`}
        />
        <Medida
          titulo="Espera en la fila"
          simbolo={<><i>W</i><sub>q</sub></>}
          valor={r.Wq}
          formato={(v) => num(v, 3)}
          unidad={u}
          pie={`≈ ${duracionLegible(aMin(r.Wq))}`}
          resaltado
        />
      </dl>

      <div className="grid border-t border-linea lg:grid-cols-3">
        <Bloque titulo="Una foto promedio de la sala">
          <FotoSala atendidos={r.r} enFila={r.Lq} />
          <p className="mt-3 text-sm text-suave">
            En promedio hay <b className="font-semibold text-tinta">{num(r.L, 2)}</b> clientes adentro:{' '}
            <b className="font-semibold text-tinta">{num(r.r, 2)}</b> siendo atendidos y{' '}
            <b className="font-semibold text-tinta">{num(r.Lq, 2)}</b> en la fila.
            {modelo === 'mms' && <> Hay {r.servidores} servidores.</>}
          </p>
        </Bloque>
        <Bloque titulo="¿En qué se le va el tiempo a cada cliente?" borde>
          <Reparto r={r} unidad={unidad} />
        </Bloque>
        <Bloque titulo="Probabilidades" borde>
          <div className="flex flex-col gap-4">
            <Barra
              titulo={<>Sala vacía <i>P</i><sub>0</sub></>}
              valor={r.P0}
              texto="Parte del tiempo en que no hay ningún cliente."
            />
            <Barra
              titulo={<>Tener que esperar <i>P</i><sub>w</sub></>}
              valor={r.Pw}
              texto={
                modelo === 'mms'
                  ? 'Clientes que llegan y encuentran a todos los servidores ocupados (Erlang C).'
                  : 'Clientes que llegan y encuentran al servidor ocupado.'
              }
            />
          </div>
        </Bloque>
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Respuesta({ titulo, contexto, children }: { titulo: string; contexto: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-semibold">{titulo}</div>
      <div className="mt-2">{children}</div>
      <p className="mt-2 text-sm text-suave">{contexto}</p>
    </div>
  );
}

function Medida({
  titulo,
  simbolo,
  valor,
  formato,
  unidad,
  pie,
  resaltado = false,
}: {
  titulo: string;
  simbolo: ReactNode;
  valor: number;
  formato: (v: number) => string;
  unidad?: string;
  pie: string;
  resaltado?: boolean;
}) {
  return (
    <div className="border-b border-r border-linea px-4 py-4 sm:px-5 lg:border-b-0">
      <dt className="flex items-baseline justify-between gap-2 text-sm text-suave">
        <span className="flex items-center gap-1.5">
          {resaltado && <span className="size-2.5 rounded-[2px] bg-senal ring-1 ring-tinta/30" aria-hidden />}
          {titulo}
        </span>
        <span className="text-tinta">{simbolo}</span>
      </dt>
      <dd className="mt-1">
        <NumeroAnimado valor={valor} formato={formato} className="font-cond text-4xl font-bold leading-none sm:text-5xl" />
        {unidad && <span className="ml-1 font-cond text-xl font-semibold text-suave">{unidad}</span>}
        <div className="mt-1 text-sm text-suave">{pie}</div>
      </dd>
    </div>
  );
}

function Bloque({ titulo, borde = false, children }: { titulo: string; borde?: boolean; children: ReactNode }) {
  return (
    <section className={`p-5 sm:p-6 ${borde ? 'border-t border-linea lg:border-l lg:border-t-0' : ''}`}>
      <h3 className="mb-4 font-cond text-xl font-bold leading-tight">{titulo}</h3>
      {children}
    </section>
  );
}

const MAX_PERSONAS = 20;

/** L = Lq + r dibujado con tickets: tinta los que están siendo atendidos, amarillo los que esperan. */
function FotoSala({ atendidos, enFila }: { atendidos: number; enFila: number }) {
  const piezas: { clave: string; parte: number; tipo: 'atendido' | 'fila' }[] = [];
  const agregar = (cantidad: number, tipo: 'atendido' | 'fila') => {
    const enteros = Math.floor(cantidad);
    for (let i = 0; i < enteros; i++) piezas.push({ clave: `${tipo}-${i}`, parte: 1, tipo });
    const resto = cantidad - enteros;
    if (resto > 0.02) piezas.push({ clave: `${tipo}-${enteros}`, parte: resto, tipo });
  };
  agregar(atendidos, 'atendido');
  agregar(enFila, 'fila');
  const sobran = piezas.length > MAX_PERSONAS;
  const mostradas = piezas.slice(0, MAX_PERSONAS);

  return (
    <div>
      <div className="flex min-h-12 flex-wrap items-end gap-1.5" aria-hidden>
        <AnimatePresence initial={false}>
          {mostradas.map((p, i) => (
            <motion.div
              key={p.clave}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.18, ease: SALIDA }}
              className="relative h-10 w-6"
            >
              {/* La silueta gris es la persona completa; el color muestra qué fracción cuenta en el promedio. */}
              <Figura cuerpo="personal" piel="var(--color-gris)" className="absolute inset-0 size-full opacity-50" />
              <motion.div
                className="absolute inset-0"
                initial={false}
                animate={{ clipPath: `inset(0 ${(1 - p.parte) * 100}% 0 0)` }}
                transition={{ duration: 0.25, ease: SALIDA }}
              >
                <Figura cuerpo={p.tipo} piel={PIELES[i % PIELES.length]} className="size-full" />
              </motion.div>
            </motion.div>
          ))}
        </AnimatePresence>
        {sobran && <span className="pb-2 text-sm font-semibold text-suave">y más…</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-suave">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-2.5 rounded-[2px] bg-tinta" /> Siendo atendidos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-2.5 rounded-[2px] bg-senal ring-1 ring-tinta/30" /> En la fila
        </span>
      </div>
    </div>
  );
}

function Reparto({ r, unidad }: { r: ResultadoOk; unidad: Unidad }) {
  const aMin = (v: number) => (unidad === 'h' ? v * 60 : v);
  const fEspera = r.W > 0 ? r.Wq / r.W : 0;
  return (
    <>
      <div className="flex h-12 overflow-hidden rounded-lg border-2 border-tinta text-sm font-semibold">
        <motion.div
          className="flex items-center overflow-hidden whitespace-nowrap bg-senal pl-3 text-sobresenal"
          initial={false}
          animate={{ width: `${fEspera * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        >
          {fEspera > 0.2 && 'Fila'}
        </motion.div>
        <div className="flex flex-1 items-center justify-end overflow-hidden whitespace-nowrap bg-tinta pr-3 text-papel">
          {1 - fEspera > 0.2 && 'Atención'}
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-suave">Esperando</dt>
          <dd className="font-semibold">{duracionLegible(aMin(r.Wq))}</dd>
        </div>
        <div className="text-right">
          <dt className="text-suave">Siendo atendido</dt>
          <dd className="font-semibold">{duracionLegible(aMin(r.tServicio))}</dd>
        </div>
      </dl>
      <p className="mt-3 text-sm text-suave">
        De las <b className="font-semibold text-tinta">{duracionLegible(aMin(r.W))}</b> que pasa adentro, el{' '}
        <b className="font-semibold text-tinta">{pct(fEspera, 0)}</b> es espera.
      </p>
    </>
  );
}

function Barra({ titulo, valor, texto }: { titulo: ReactNode; valor: number; texto: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm font-semibold">
        <span>{titulo}</span>
        <NumeroAnimado valor={valor} formato={(v) => pct(v)} className="font-cond text-xl font-bold" />
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-tinta/10">
        <motion.div
          className="h-full rounded-full bg-tinta"
          initial={false}
          animate={{ width: `${valor * 100}%` }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        />
      </div>
      <p className="mt-1.5 text-sm text-suave">{texto}</p>
    </div>
  );
}

function Inestable({
  modelo,
  params,
  r,
  unidad,
}: {
  modelo: ModeloId;
  params: Parametros;
  r: ResultadoInestable;
  unidad: Unidad;
}) {
  const u = UNIDADES[unidad].nombre;
  const maximo = Math.max(params.lambda, r.capacidad);
  const quien = r.servidores === 1 ? 'el servidor solo puede' : `los ${r.servidores} servidores juntos solo pueden`;
  return (
    <div className="panel overflow-hidden border-2 border-tinta">
      <div className="peligro h-3" aria-hidden />
      <div className="p-6 sm:p-8">
        <h3 className="font-cond text-4xl font-bold leading-none">La fila crece sin límite</h3>
        <p className="mt-3 max-w-3xl text-suave">
          Llegan <b className="font-semibold text-tinta">{num(params.lambda, 2)}</b> clientes por {u}, pero {quien}{' '}
          atender <b className="font-semibold text-tinta">{num(r.capacidad, 2)}</b>. Con <i>ρ</i> = {pct(r.rho)} el
          sistema nunca se estabiliza y no existen <i>L</i>, <i>L</i>
          <sub>q</sub>, <i>W</i> ni <i>W</i>
          <sub>q</sub>. Baja <i>λ</i> o sube <i>μ</i>
          {modelo === 'mms' && (
            <>
              {' '}
              o <i>s</i>
            </>
          )}
          .
        </p>
        <div className="mt-6 flex max-w-3xl flex-col gap-3">
          {[
            { texto: 'Llegan (λ)', valor: params.lambda, clase: 'bg-alerta text-white' },
            { texto: 'Se pueden atender (sμ)', valor: r.capacidad, clase: 'bg-tinta text-papel' },
          ].map((b) => (
            <div key={b.texto} className="grid grid-cols-[130px_1fr] items-center gap-3 text-sm sm:grid-cols-[180px_1fr]">
              <span className="font-semibold">{b.texto}</span>
              <div className="h-8 overflow-hidden rounded-md bg-tinta/10">
                <motion.div
                  className={`flex h-full items-center justify-end rounded-md pr-2 font-cond text-base font-bold ${b.clase}`}
                  initial={false}
                  animate={{ width: `${(b.valor / maximo) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                >
                  {num(b.valor, 2)}
                </motion.div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
