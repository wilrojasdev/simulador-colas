import { AnimatePresence, motion } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  calcular,
  comparacionVariabilidad,
  curvaCarga,
  distribucionN,
  type ModeloId,
  type Parametros,
  type Resultado,
} from '../lib/colas';
import { num, pct, tiempo, type Unidad } from '../lib/formato';
import { Segmentado, SALIDA } from './Basicos';

const TINTA = 'var(--color-tinta)';
const SENAL = 'var(--color-senal)';
const GRIS = 'var(--color-gris)';
const EJE = { stroke: 'var(--color-suave)', fontSize: 12, tickLine: false, axisLine: false } as const;
const REJILLA = 'color-mix(in srgb, var(--color-tinta) 10%, transparent)';
const CURSOR = 'color-mix(in srgb, var(--color-tinta) 8%, transparent)';

interface Props {
  modelo: ModeloId;
  params: Parametros;
  resultado: Resultado;
  unidad: Unidad;
}

export function Graficas({ modelo, params, resultado, unidad }: Props) {
  const [elegida, setElegida] = useState<'carga' | 'dist' | 'var'>('carga');
  if (resultado.tipo === 'invalido') return null;
  const distrib = modelo === 'mm1' || modelo === 'mms';
  const opciones = [
    { valor: 'carga' as const, texto: 'Si llegan más' },
    { valor: (distrib ? 'dist' : 'var') as 'dist' | 'var', texto: distrib ? '¿Cuántos hay?' : 'Variabilidad' },
  ];
  // Si el modelo cambia y la opción elegida ya no existe, se vuelve a la primera.
  const actual = opciones.some((o) => o.valor === elegida) ? elegida : 'carga';
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Segmentado id="grafica" etiqueta="Qué gráfica ver" valor={actual} onCambio={setElegida} opciones={opciones} />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={actual}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2, ease: SALIDA }}
        >
          {actual === 'carga' ? (
            <CurvaCarga modelo={modelo} params={params} resultado={resultado} unidad={unidad} />
          ) : distrib ? (
            <DistribucionClientes modelo={modelo} params={params} resultado={resultado} />
          ) : (
            <Variabilidad modelo={modelo} params={params} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Marco({ titulo, subtitulo, extra, children, pie }: { titulo: string; subtitulo: string; extra?: ReactNode; children: ReactNode; pie?: ReactNode }) {
  return (
    <div className="panel flex h-full flex-col p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-cond text-2xl font-bold leading-tight">{titulo}</h3>
          <p className="mt-0.5 text-sm text-suave">{subtitulo}</p>
        </div>
        {extra}
      </div>
      <div className="mt-4 h-64 sm:h-72">{children}</div>
      {pie && <div className="mt-3 text-sm text-suave">{pie}</div>}
    </div>
  );
}

function Globo({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-linea bg-papel px-3 py-2 text-sm shadow-alto">{children}</div>
  );
}

function CurvaCarga({ modelo, params, resultado, unidad }: Props) {
  const [metrica, setMetrica] = useState<'Lq' | 'Wq'>('Lq');
  const datos = useMemo(() => curvaCarga(modelo, params), [modelo, params]);
  const actual = resultado.tipo === 'ok' ? resultado : null;
  const fmt = (v: number) => (metrica === 'Lq' ? `${num(v, 2)} clientes` : tiempo(v, unidad).principal);

  // ¿Qué pasaría con un 10 % más de llegadas?
  const mas = actual ? calcular(modelo, { ...params, lambda: params.lambda * 1.1 }) : null;
  let pie: ReactNode = 'Con ρ ≥ 100 % la curva ya no tiene punto: la fila crece sin límite.';
  if (actual && mas) {
    pie =
      mas.tipo === 'ok' ? (
        <>
          Si llegaran un <b className="font-semibold text-tinta">10 % más</b> de clientes, la fila pasaría de{' '}
          <b className="font-semibold text-tinta">{num(actual.Lq, 2)}</b> a <b className="font-semibold text-tinta">{num(mas.Lq, 2)}</b> clientes (
          {mas.Lq / actual.Lq >= 1.995 ? `${num(mas.Lq / actual.Lq, 1)} veces más` : `+${pct(mas.Lq / actual.Lq - 1, 0)}`}).
        </>
      ) : (
        <>
          Con solo un <b className="font-semibold text-tinta">10 % más</b> de clientes el sistema se volvería inestable.
        </>
      );
  }

  return (
    <Marco
      titulo="¿Qué pasa si llegan más clientes?"
      subtitulo="Cuando la utilización se acerca al 100 %, la fila se dispara."
      extra={
        <Segmentado
          id="metrica"
          etiqueta="Qué medir"
          valor={metrica}
          onCambio={setMetrica}
          opciones={[
            { valor: 'Lq', texto: 'Clientes' },
            { valor: 'Wq', texto: 'Espera' },
          ]}
        />
      }
      pie={pie}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={datos} margin={{ top: 12, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="relleno-curva" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SENAL} stopOpacity={0.75} />
              <stop offset="100%" stopColor={SENAL} stopOpacity={0.15} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey="rho" type="number" domain={[0, 'dataMax']} tickFormatter={(v: number) => pct(v, 0)} {...EJE} />
          <YAxis tickFormatter={(v: number) => num(v, 1)} width={44} {...EJE} />
          <Tooltip
            cursor={{ stroke: 'color-mix(in srgb, var(--color-tinta) 35%, transparent)' }}
            content={({ active, payload }: any) =>
              active && payload?.length ? (
                <Globo>
                  <div className="text-suave">Utilización {pct(payload[0].payload.rho, 0)}</div>
                  <div className="font-cond text-base font-bold">{fmt(payload[0].value)}</div>
                </Globo>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey={metrica}
            stroke={TINTA}
            strokeWidth={2}
            fill="url(#relleno-curva)"
            animationDuration={300}
          />
          {actual && (
            <ReferenceDot
              x={actual.rho}
              y={actual[metrica]}
              r={7}
              fill={SENAL}
              stroke={TINTA}
              strokeWidth={2.5}
              label={{ value: 'Tu sistema', position: 'top', fill: TINTA, fontSize: 12, fontWeight: 600 }}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </Marco>
  );
}

const COLORES_N = { vacio: GRIS, sinFila: TINTA, conFila: SENAL };

function DistribucionClientes({
  modelo,
  params,
  resultado,
}: {
  modelo: ModeloId;
  params: Parametros;
  resultado: Resultado;
}) {
  const pn = useMemo(() => distribucionN(modelo, params), [modelo, params]);
  if (!pn || resultado.tipo !== 'ok') {
    return (
      <Marco titulo="¿Cuántos clientes hay?" subtitulo="Probabilidad de que haya n clientes en el sistema.">
        <div className="grid h-full place-items-center text-center text-suave">
          Con un sistema inestable no hay una distribución fija.
        </div>
      </Marco>
    );
  }
  const s = resultado.servidores;
  const datos = pn.map((p, n) => ({ n, p, tipo: n === 0 ? 'vacio' : n <= s ? 'sinFila' : 'conFila' }) as const);
  const hayFila = 1 - pn.slice(0, s + 1).reduce((a, b) => a + b, 0);
  const masProbable = datos.reduce((a, b) => (b.p > a.p ? b : a)).n;
  const leyenda = [
    { texto: 'Vacío', color: COLORES_N.vacio },
    { texto: s === 1 ? 'Atendiendo, sin fila' : `Hasta ${s}: sin fila`, color: COLORES_N.sinFila },
    { texto: 'Hay fila', color: COLORES_N.conFila },
  ];

  return (
    <Marco
      titulo="¿Cuántos clientes hay?"
      subtitulo="Probabilidad de encontrar n clientes en el sistema (en fila + atendidos)."
      extra={
        <div className="flex flex-wrap gap-3 text-xs text-suave">
          {leyenda.map((l) => (
            <span key={l.texto} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-[2px] ring-1 ring-tinta/20" style={{ background: l.color }} />
              {l.texto}
            </span>
          ))}
        </div>
      }
      pie={
        <>
          Lo más probable es encontrar <b className="font-semibold text-tinta">{masProbable}</b>{' '}
          {masProbable === 1 ? 'cliente' : 'clientes'}. Hay un <b className="font-semibold text-tinta">{pct(hayFila)}</b> de
          probabilidad de que alguien esté haciendo fila.
        </>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} margin={{ top: 12, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={REJILLA} vertical={false} />
          <XAxis dataKey="n" {...EJE} />
          <YAxis tickFormatter={(v: number) => pct(v, 0)} width={44} {...EJE} />
          <Tooltip
            cursor={{ fill: CURSOR }}
            content={({ active, payload }: any) =>
              active && payload?.length ? (
                <Globo>
                  <div className="text-suave">n = {payload[0].payload.n}</div>
                  <div className="font-cond text-base font-bold">{pct(payload[0].value, 2)}</div>
                </Globo>
              ) : null
            }
          />
          <Bar dataKey="p" radius={[3, 3, 0, 0]} animationDuration={300}>
            {datos.map((d) => (
              <Cell key={d.n} fill={COLORES_N[d.tipo]} stroke={d.tipo === 'conFila' ? TINTA : undefined} strokeOpacity={0.35} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Marco>
  );
}

function Variabilidad({ modelo, params }: { modelo: ModeloId; params: Parametros }) {
  const datos = useMemo(() => comparacionVariabilidad(modelo, params), [modelo, params]);
  return (
    <Marco
      titulo="La variabilidad alarga la fila"
      subtitulo="Misma llegada y misma duración promedio; solo cambia cuánto varía la atención."
      pie={
        datos.length ? (
          <>
            Con atención de duración fija (M/D/1) la fila es <b className="font-semibold text-tinta">la mitad</b> que con atención
            exponencial (M/M/1). Mientras más impredecible es la atención, más larga es la fila.
          </>
        ) : (
          'Con ρ ≥ 100 % ninguna variante es estable.'
        )
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={datos} layout="vertical" margin={{ top: 4, right: 56, bottom: 0, left: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="nombre" width={150} {...EJE} tick={{ fill: TINTA, fontSize: 13 }} />
          <Tooltip
            cursor={{ fill: CURSOR }}
            content={({ active, payload }: any) =>
              active && payload?.length ? (
                <Globo>
                  <div className="text-suave">σ = {num(payload[0].payload.sigma, 3)}</div>
                  <div className="font-cond text-base font-bold">Lq = {num(payload[0].value, 3)}</div>
                </Globo>
              ) : null
            }
          />
          <Bar dataKey="Lq" radius={[0, 3, 3, 0]} animationDuration={300} barSize={26}>
            {datos.map((d) => (
              <Cell key={d.nombre} fill={d.actual ? SENAL : GRIS} stroke={d.actual ? TINTA : undefined} strokeOpacity={0.4} />
            ))}
            <LabelList
              dataKey="Lq"
              position="right"
              formatter={(v: unknown) => num(Number(v), 2)}
              fill={TINTA}
              fontSize={13}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Marco>
  );
}
