import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import type { ModeloId } from '../lib/colas';
import { UNIDADES, type Unidad } from '../lib/formato';

/** Cada dato que se escribe en el formulario. */
export type Dato = 'lambda' | 'mu' | 's' | 'sigma';
type Parte = 'puerta' | 'mostrador' | 's' | 'reloj';

/** Qué partes del dibujo se iluminan con cada dato. */
const PARTES: Record<Dato, Parte[]> = {
  lambda: ['puerta'],
  mu: ['mostrador'],
  s: ['mostrador', 's'],
  sigma: ['mostrador', 'reloj'],
};

const W = 520;
const H = 300;
/** lo que se recorta de pared vacía arriba */
const ARRIBA = 22;
/** donde la pared se junta con el piso */
const PISO = 196;
/** borde de arriba del frente del mostrador */
const MESA = 176;
const EN_FILA = 3;
const PASO_MS = 1700;
const COND = 'Barlow Condensed, sans-serif';

const CAMINAR = { duration: 0.8, ease: [0.645, 0.045, 0.355, 1] } as const;
const SALIR = { duration: 0.7, ease: [0.4, 0, 1, 1] } as const;
const ENFOQUE = { duration: 0.25, ease: [0.23, 1, 0.32, 1] } as const;
const RESORTE = { type: 'spring', stiffness: 500, damping: 40 } as const;

const ROPA = ['#e07a5f', '#3d8a7a', '#5b6cc9', '#c9a227', '#8e5aa8', '#d1495b'];
const PIEL = ['#f1c9a5', '#d9a07a', '#a86f4c', '#7a4a2e'];
const PELO = ['#2b2135', '#5a3a22', '#8a5a2b', '#c98a3a'];

/** Dónde va cada cosa: con un servidor, un mostrador ancho; en M/M/s se dibujan tres. */
function plano(c: number) {
  const ancho = c === 1 ? 86 : 58;
  const centros = c === 1 ? [418] : [316, 388, 460];
  const x0 = centros[0] - ancho / 2;
  const x1 = centros[c - 1] + ancho / 2;
  const fila = Array.from({ length: EN_FILA }, (_, i) => ({ x: x0 - 34 - 38 * i, y: 250 }));
  return { ancho, centros, x0, x1, fila };
}

/**
 * Turnos de un reloj fijo, no de la simulación: es un dibujo que explica, así que cada tanto un
 * mostrador despacha, el primero de la fila pasa y entra alguien nuevo por la puerta.
 */
interface Turnos {
  mostradores: number[];
  fila: number[];
  prox: number;
  turno: number;
}

const inicio = (c: number): Turnos => ({
  mostradores: Array.from({ length: c }, (_, k) => k),
  fila: Array.from({ length: EN_FILA }, (_, i) => c + i),
  prox: c + EN_FILA,
  turno: 0,
});

function avanzar(t: Turnos): Turnos {
  const k = t.turno % t.mostradores.length;
  const [primero, ...resto] = t.fila;
  const mostradores = t.mostradores.slice();
  mostradores[k] = primero;
  return { mostradores, fila: [...resto, t.prox], prox: t.prox + 1, turno: t.turno + 1 };
}

function Persona({ id, escala = 1, ropa }: { id: number; escala?: number; ropa?: string }) {
  return (
    <g transform={escala === 1 ? undefined : `scale(${escala})`}>
      <ellipse rx={10} ry={3} className="fill-tinta/15" />
      <rect x={-6} y={-15} width={5} height={15} rx={2.5} className="fill-tinta" />
      <rect x={1} y={-15} width={5} height={15} rx={2.5} className="fill-tinta" />
      <rect x={-9} y={-37} width={18} height={25} rx={8} fill={ropa ?? ROPA[id % ROPA.length]} />
      <circle cy={-44} r={7} fill={PIEL[(id * 3) % PIEL.length]} />
      <path d="M-7 -45 a7 7 0 0 1 14 0 q-7 -3 -14 0z" fill={PELO[(id * 5) % PELO.length]} />
    </g>
  );
}

/** Círculo amarillo con la letra del dato; late cuando ese dato está señalado. */
function Insignia({ x, y, letra, activa, quieta }: { x: number; y: number; letra: string; activa: boolean; quieta: boolean }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {activa && !quieta && (
        <motion.circle
          r={13}
          className="fill-senal"
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{ scale: 2.2, opacity: 0 }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}
      <motion.g animate={{ scale: activa ? 1.25 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 26 }}>
        <circle r={13} className="fill-senal stroke-tinta" strokeWidth={2} />
        <text y={5.5} textAnchor="middle" fontSize={17} fontStyle="italic" fontWeight={600} className="fill-sobresenal">
          {letra}
        </text>
      </motion.g>
    </g>
  );
}

/** Mostrador en 2.5D: frente, tapa y costado, con la franja amarilla de la marca. */
function Mostrador({ cx, ancho }: { cx: number; ancho: number }) {
  const a = cx - ancho / 2;
  const b = cx + ancho / 2;
  const fondo = 38;
  return (
    <g>
      {/* quien atiende, detrás */}
      <g transform={`translate(${cx} ${PISO})`}>
        <Persona id={7} escala={1.15} ropa="#2f4858" />
      </g>
      <polygon points={`${a - 2},${MESA + fondo + 2} ${b + 12},${MESA + fondo + 2} ${b + 12},${MESA + fondo - 6}`} className="fill-tinta/10" />
      <polygon points={`${b},${MESA} ${b + 10},${MESA - 8} ${b + 10},${MESA + fondo - 8} ${b},${MESA + fondo}`} fill="#b3a594" />
      <rect x={a} y={MESA} width={ancho} height={fondo} fill="#c9bcae" />
      <rect x={a} y={MESA + 8} width={ancho} height={5} className="fill-senal" />
      <polygon points={`${a},${MESA} ${b},${MESA} ${b + 10},${MESA - 8} ${a + 10},${MESA - 8}`} className="fill-papel stroke-tinta/15" />
    </g>
  );
}

export function GuiaDatos({
  modelo,
  unidad,
  foco,
  onFoco,
}: {
  modelo: ModeloId;
  unidad: Unidad;
  foco: Dato | null;
  onFoco: (d: Dato | null) => void;
}) {
  const c = modelo === 'mms' ? 3 : 1;
  const p = plano(c);
  const quieta = useReducedMotion() ?? false;
  const lienzo = useRef<SVGSVGElement>(null);
  const [guardados, setTurnos] = useState(() => inicio(c));
  // Si se cambió de modelo, se arranca con la cantidad de mostradores nueva.
  const turnos = guardados.mostradores.length === c ? guardados : inicio(c);

  useEffect(() => {
    if (quieta) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (lienzo.current) io.observe(lienzo.current);
    const reloj = window.setInterval(() => {
      if (visible && !document.hidden) setTurnos((t) => avanzar(t.mostradores.length === c ? t : inicio(c)));
    }, PASO_MS);
    return () => {
      window.clearInterval(reloj);
      io.disconnect();
    };
  }, [quieta, c]);

  const activas = foco ? PARTES[foco] : null;
  const op = (parte: Parte) => (!activas || activas.includes(parte) ? 1 : 0.28);
  const encendida = (parte: Parte) => !!activas?.includes(parte);

  const gente = [
    ...turnos.mostradores.map((id, k) => ({ id, x: p.centros[k], y: 240 })),
    ...turnos.fila.map((id, i) => ({ id, ...p.fila[i] })),
  ];
  const ultimo = p.fila[EN_FILA - 1];
  const reloj = { x: p.x0 - 36, y: 118 };
  const tablero = { x0: p.x0 + 4, x1: p.x1 - 4 };

  const u = UNIDADES[unidad].nombre;
  const quien = modelo === 'mms' ? 'cada mostrador' : 'el mostrador';
  const items: { dato: Dato; letra: string; titulo: string; texto: string }[] = [
    { dato: 'lambda', letra: 'λ', titulo: 'Llegadas', texto: `La puerta: cuántos clientes entran, en promedio, por ${u}.` },
    {
      dato: 'mu',
      letra: 'μ',
      titulo: 'Atención',
      texto:
        `El mostrador: cuántos clientes despacha ${quien} por ${u}.` +
        (modelo === 'md1' ? ' Aquí cada atención dura exactamente lo mismo.' : ''),
    },
  ];
  if (modelo === 'mms') {
    items.push({ dato: 's', letra: 's', titulo: 'Servidores', texto: 'Cuántos mostradores atienden a la vez, con una sola fila para todos.' });
  }
  if (modelo === 'mg1') {
    items.push({
      dato: 'sigma',
      letra: 'σ',
      titulo: 'Variación',
      texto: 'Qué tanto cambia la duración de una atención a otra: con σ grande, algunas se eternizan.',
    });
  }

  return (
    <section aria-labelledby="guia-titulo" className="lg:sticky lg:top-6">
      <h2 id="guia-titulo" className="font-cond text-2xl font-bold">
        Así se lee cada dato
      </h2>
      <p className="text-sm text-suave">Un dibujo para ubicar cada número. Señala un dato y se ilumina dónde va.</p>

      <figure className="mt-4 overflow-hidden rounded-2xl shadow-alto ring-1 ring-tinta/5">
        <svg
          ref={lienzo}
          viewBox={`0 ${ARRIBA} ${W} ${H - ARRIBA}`}
          className="block w-full"
          role="img"
          aria-label="Dibujo de una sala: la puerta por donde llegan los clientes, la fila y el mostrador que los atiende"
        >
          <defs>
            <linearGradient id="guia-afuera" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff1cc" />
              <stop offset="1" stopColor="#ffd27a" />
            </linearGradient>
          </defs>

          {/* pared y piso con baldosas en perspectiva */}
          <rect y={ARRIBA} width={W} height={PISO - ARRIBA} className="fill-papel" />
          <rect y={PISO - 10} width={W} height={10} className="fill-gris/45" />
          <rect y={PISO} width={W} height={H - PISO} className="fill-piso" />
          <g className="stroke-tinta/10" strokeWidth={1.5}>
            {[212, 232, 258, 290].map((y) => (
              <line key={y} x1={0} x2={W} y1={y} y2={y} />
            ))}
            {Array.from({ length: 12 }, (_, i) => -180 + 80 * i).map((x) => (
              <line key={x} x1={260 + (x - 260) * 0.5} y1={PISO} x2={x} y2={H} />
            ))}
          </g>

          {/* planta, de adorno */}
          <motion.g animate={{ opacity: activas ? 0.4 : 1 }} transition={ENFOQUE}>
            <ellipse cx={160} cy={PISO + 2} rx={15} ry={3.5} className="fill-tinta/15" />
            <ellipse cx={152} cy={156} rx={6} ry={16} transform="rotate(-28 152 156)" fill="#4f8a5b" />
            <ellipse cx={168} cy={154} rx={6} ry={17} transform="rotate(24 168 154)" fill="#5f9d68" />
            <ellipse cx={160} cy={148} rx={6} ry={19} fill="#467d51" />
            <path d="M147 174 L173 174 L169 197 L151 197 Z" fill="#c66b4e" />
          </motion.g>

          {/* λ: la puerta y el camino de entrada */}
          <motion.g animate={{ opacity: op('puerta') }} transition={ENFOQUE}>
            <rect x={54} y={58} width={56} height={16} rx={3} className="fill-senal" />
            <text x={82} y={70} textAnchor="middle" fontSize={10} fontWeight={700} letterSpacing={1} fontFamily={COND} className="fill-sobresenal">
              ENTRADA
            </text>
            <rect x={48} y={80} width={68} height={PISO - 80} rx={3} className="fill-tinta" />
            <rect x={55} y={87} width={54} height={PISO - 87} fill="url(#guia-afuera)" />
            <rect x={55} y={PISO - 12} width={54} height={12} className="fill-gris/70" />
            <polygon points={`55,87 36,97 36,${PISO + 8} 55,${PISO}`} className="fill-gris" />
            <circle cx={41} cy={146} r={2.4} className="fill-tinta" />
            <motion.path
              d={`M 96 ${PISO + 14} Q 150 ${PISO + 52} ${ultimo.x - 24} ${ultimo.y - 2}`}
              fill="none"
              className="stroke-senal"
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray="1 9"
              animate={quieta ? undefined : { strokeDashoffset: [0, -20] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            />
            <Insignia x={116} y={80} letra="λ" activa={encendida('puerta')} quieta={quieta} />
          </motion.g>

          {/* μ: tablero de turnos y mostradores */}
          <motion.g animate={{ opacity: op('mostrador') }} transition={ENFOQUE}>
            <rect x={tablero.x0} y={34} width={tablero.x1 - tablero.x0} height={42} rx={6} className="fill-tablero" />
            <text x={tablero.x0 + 10} y={50} fontSize={10} fontWeight={600} letterSpacing={1} fontFamily={COND} className="fill-led" opacity={0.7}>
              TURNO
            </text>
            <AnimatePresence initial={false} mode="popLayout">
              <motion.text
                key={turnos.turno}
                x={tablero.x1 - 10}
                y={68}
                textAnchor="end"
                fontSize={26}
                fontWeight={800}
                fontFamily="Doto, monospace"
                className="fill-led"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {String((41 + turnos.turno) % 1000).padStart(3, '0')}
              </motion.text>
            </AnimatePresence>
            {p.centros.map((cx) => (
              <Mostrador key={cx} cx={cx} ancho={p.ancho} />
            ))}
            <Insignia x={p.x1 + 6} y={MESA - 24} letra="μ" activa={encendida('mostrador')} quieta={quieta} />
          </motion.g>

          {/* s: los mostradores que atienden a la vez */}
          {c > 1 && (
            <motion.g animate={{ opacity: op('s') }} transition={ENFOQUE}>
              <path
                d={`M ${p.x0} 122 V 112 H ${p.x1} V 122`}
                fill="none"
                className="stroke-tinta"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <Insignia x={(p.x0 + p.x1) / 2} y={112} letra="s" activa={encendida('s')} quieta={quieta} />
            </motion.g>
          )}

          {/* σ: un reloj que avanza disparejo, como las atenciones de M/G/1 */}
          {modelo === 'mg1' && (
            <motion.g animate={{ opacity: op('reloj') }} transition={ENFOQUE}>
              <circle cx={reloj.x} cy={reloj.y} r={15} className="fill-papel stroke-tinta" strokeWidth={2.5} />
              <line x1={reloj.x} y1={reloj.y} x2={reloj.x} y2={reloj.y - 7} className="stroke-tinta" strokeWidth={2} strokeLinecap="round" />
              <line x1={reloj.x} y1={reloj.y} x2={reloj.x} y2={reloj.y - 11} className="stroke-alerta" strokeWidth={2} strokeLinecap="round">
                {!quieta && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from={`0 ${reloj.x} ${reloj.y}`}
                    to={`360 ${reloj.x} ${reloj.y}`}
                    dur="2.6s"
                    repeatCount="indefinite"
                    calcMode="spline"
                    keyTimes="0;1"
                    keySplines="0.8 0 0.2 1"
                  />
                )}
              </line>
              <Insignia x={reloj.x + 27} y={reloj.y - 13} letra="σ" activa={encendida('reloj')} quieta={quieta} />
            </motion.g>
          )}

          {/* la gente: entra por la puerta, hace fila y pasa al mostrador que se libera */}
          <motion.g animate={{ opacity: activas ? 0.5 : 1 }} transition={ENFOQUE}>
            <AnimatePresence initial={false}>
              {gente.map((g) => (
                <motion.g
                  key={g.id}
                  initial={{ x: 82, y: PISO + 4, opacity: 0 }}
                  animate={{ x: g.x, y: g.y, opacity: 1 }}
                  exit={{ x: g.x + 34, y: H + 40, opacity: 0, transition: SALIR }}
                  transition={CAMINAR}
                >
                  <Persona id={g.id} />
                </motion.g>
              ))}
            </AnimatePresence>
          </motion.g>
        </svg>
      </figure>

      <ul className="mt-3 grid gap-1">
        {items.map((it) => {
          const activo = foco === it.dato;
          return (
            <li
              key={it.dato}
              onPointerEnter={(e) => e.pointerType === 'mouse' && onFoco(it.dato)}
              onPointerLeave={(e) => e.pointerType === 'mouse' && onFoco(null)}
              className="relative flex gap-3 rounded-xl p-3"
            >
              {activo && <motion.span layoutId="dato-activo" className="absolute inset-0 rounded-xl bg-papel shadow-panel" transition={RESORTE} />}
              <span className="relative grid size-9 shrink-0 place-items-center rounded-full bg-senal text-lg font-medium italic text-sobresenal">
                {it.letra}
              </span>
              <span className="relative">
                <span className="block font-semibold">{it.titulo}</span>
                <span className="block text-sm text-suave">{it.texto}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 px-3 text-sm text-suave">
        La fila no se escribe: se forma sola cuando la puerta trae gente más rápido de lo que el mostrador alcanza a atender.
      </p>
    </section>
  );
}
