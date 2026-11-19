import {
  AnimatePresence,
  motion,
  useAnimationFrame,
  useIsPresent,
  useMotionValue,
  useTransform,
  type MotionValue,
  type TargetAndTransition,
} from 'motion/react';
import { ChevronDown, DoorOpen, LogOut, Pause, Play, RotateCcw } from 'lucide-react';
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { servidoresDe, type ModeloId, type Parametros, type Resultado, type ResultadoOk } from '../lib/colas';
import { num, pct, tiempo, UNIDADES, type Unidad } from '../lib/formato';
import { Simulacion, type Cliente, type Estadisticas, type Foto, type Llamado } from '../lib/simulacion';
import { MODELOS } from '../modelos';
import { SALIDA, Segmentado, turno } from './Basicos';
import { Figura, PIELES } from './Persona';

// La sala en 3D (three.js) se descarga aparte para que el resto de la página abra rápido.
const Sala3D = lazy(() => import('./sala3d/Sala3D'));

function hayWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2');
  } catch {
    return false;
  }
}

/** Si la sala 3D falla (sin WebGL, GPU bloqueada…), se vuelve a la vista plana. */
class Aislar extends Component<{ alFallar: () => void; children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  componentDidCatch() {
    this.props.alFallar();
  }
  render() {
    return this.state.error ? null : this.props.children;
  }
}

const FIG_W = 24;
const FIG_H = 40;
/** Distancia entre dos personas seguidas en la fila. */
const COLUMNA = 28;
/** Distancia entre las vueltas de la fila en zigzag. */
const FILA = 50;
/** Caminar: arranca y frena suave (easeInOutCubic). */
const CAMINAR = [0.65, 0, 0.35, 1] as const;
/** A velocidad 1×, llegan unos 0,9 clientes por segundo real. */
const LLEGADAS_POR_SEGUNDO = 0.9;
/** En 3D la gente camina distancias reales: el reloj va más despacio para que se alcance a ver. */
const LLEGADAS_POR_SEGUNDO_3D = 0.55;

interface Props {
  modelo: ModeloId;
  params: Parametros;
  unidad: Unidad;
  resultado: Resultado;
}

export function Escena({ modelo, params, unidad, resultado }: Props) {
  const servidores = servidoresDe(modelo, params);
  const valido = resultado.tipo !== 'invalido';
  const conf = useMemo(
    () => ({ lambda: params.lambda, mu: params.mu, servidores, dist: MODELOS[modelo].dist, sigma: params.sigma }),
    [params.lambda, params.mu, params.sigma, servidores, modelo],
  );
  const confRef = useRef(conf);
  confRef.current = conf;

  const simRef = useRef<Simulacion | null>(null);
  const [foto, setFoto] = useState<Foto | null>(null);
  const [reinicios, setReinicios] = useState(0);
  const [velocidad, setVelocidad] = useState(1);
  const [pausa, setPausa] = useState(false);
  const [vista, setVista] = useState<'3d' | 'plano'>(() => (hayWebGL() ? '3d' : 'plano'));
  const vistaRef = useRef(vista);
  vistaRef.current = vista;
  // Quienes van caminando hacia un mostrador: mientras haya alguien, el reloj de la simulación espera.
  const caminando = useRef(new Set<number>());
  const velRef = useRef(velocidad);
  velRef.current = velocidad;
  const pausaRef = useRef(pausa);
  pausaRef.current = pausa;
  const reloj = useMotionValue(0);

  // Simulación nueva al cambiar de modelo o de número de servidores
  useEffect(() => {
    if (!valido) {
      simRef.current = null;
      setFoto(null);
      return;
    }
    const sim = new Simulacion(confRef.current);
    simRef.current = sim;
    reloj.set(0);
    setFoto(sim.foto());
  }, [modelo, servidores, valido, reinicios, reloj]);

  // λ, μ y σ cambian en caliente: la fila sigue donde estaba
  useEffect(() => {
    simRef.current?.configurar(conf);
  }, [conf]);

  useAnimationFrame((_, delta) => {
    const sim = simRef.current;
    if (!sim || pausaRef.current) return;
    const en3D = vistaRef.current === '3d';
    if (en3D && caminando.current.size > 0) return;
    const segundos = Math.min(delta, 100) / 1000;
    const ritmo = en3D ? LLEGADAS_POR_SEGUNDO_3D : LLEGADAS_POR_SEGUNDO;
    const escala = ritmo / confRef.current.lambda; // tiempo simulado por segundo real
    const cambio = sim.avanzar(sim.t + segundos * escala * velRef.current);
    reloj.set(sim.t);
    if (cambio) setFoto(sim.foto());
  });

  if (!valido || !foto) {
    return (
      <div className="panel grid min-h-[320px] place-items-center p-6 text-center text-suave">
        Escribe valores válidos para abrir la sala.
      </div>
    );
  }

  const ocupados = foto.servidores.filter(Boolean).length;
  const nombreServidor = modelo === 'mms' ? 'Servidor' : 'Ventanilla';

  return (
    <div className="panel flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-cond text-2xl font-bold">La sala, en vivo</h2>
          <p className="max-w-md text-sm text-suave">
            Cada persona llega al azar, toma su turno, hace fila si no hay quien la atienda y sale al terminar.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Segmentado
            id="vista"
            etiqueta="Vista de la sala"
            valor={vista}
            onCambio={setVista}
            opciones={[
              { valor: '3d', texto: '3D' },
              { valor: 'plano', texto: 'Plano' },
            ]}
          />
          <Segmentado
            id="velocidad"
            etiqueta="Velocidad de la simulación"
            valor={velocidad}
            onCambio={setVelocidad}
            opciones={[
              { valor: 0.5, texto: '½×' },
              { valor: 1, texto: '1×' },
              { valor: 2, texto: '2×' },
              { valor: 4, texto: '4×' },
            ]}
          />
          <BotonIcono etiqueta={pausa ? 'Continuar' : 'Pausar'} onClick={() => setPausa((p) => !p)}>
            {pausa ? <Play className="size-4" /> : <Pause className="size-4" />}
          </BotonIcono>
          <BotonIcono etiqueta="Reiniciar" onClick={() => setReinicios((n) => n + 1)}>
            <RotateCcw className="size-4" />
          </BotonIcono>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border-2 border-tinta">
        <Tablero llamado={foto.llamado} enCola={foto.enCola} nombreServidor={nombreServidor} />
        {vista === '3d' ? (
          <Aislar alFallar={() => setVista('plano')}>
            <Suspense
              fallback={
                <div className="piso grid h-[clamp(300px,50vw,540px)] place-items-center text-sm text-suave">
                  Armando la sala…
                </div>
              }
            >
              <Sala3D
                foto={foto}
                reloj={reloj}
                velocidad={velocidad}
                pausa={pausa}
                letra={nombreServidor[0]}
                caminando={caminando.current}
              />
            </Suspense>
          </Aislar>
        ) : (
          <Sala
            foto={foto}
            reloj={reloj}
            velocidad={pausa ? 1 : velocidad}
            lambda={params.lambda}
            unidad={unidad}
            letra={nombreServidor[0]}
          />
        )}
      </div>

      <dl className="grid grid-cols-2 gap-y-4 sm:grid-cols-4">
        <Dato titulo="Tiempo simulado">
          <Reloj key={unidad} reloj={reloj} unidad={unidad} />
        </Dato>
        <Dato titulo="En la fila">{foto.enCola}</Dato>
        <Dato titulo="Siendo atendidos">
          {ocupados} <span className="text-base font-medium text-suave">de {servidores}</span>
        </Dato>
        <Dato titulo="Ya atendidos">{foto.atendidos}</Dato>
      </dl>

      <Comparacion teoria={resultado.tipo === 'ok' ? resultado : null} stats={foto.stats} unidad={unidad} />
    </div>
  );
}

interface Punto {
  x: number;
  y: number;
}

/** Dónde queda cada cosa en la sala, según el ancho disponible. */
interface Plano {
  ancho: number;
  alto: number;
  entrada: Punto;
  salidaX: number;
  x0: number;
  x1: number;
  filas: number;
  porFila: number;
  yFila0: number;
  /** borde izquierdo de los mostradores */
  mostradorX: number;
  altoMostrador: number;
  /** dónde se para el cliente mientras lo atienden */
  clienteX: number;
  /** centro vertical de cada mostrador */
  ys: number[];
  separacion: number;
}

function hacerPlano(ancho: number, servidores: number): Plano {
  const separacion = servidores <= 4 ? 58 : servidores <= 8 ? 48 : 40;
  const alto = Math.max(270, servidores * separacion + 30);
  const mostradorX = ancho - 34 - 76;
  const clienteX = mostradorX - 15;
  const x1 = clienteX - 36;
  // En pantallas anchas la fila no ocupa todo el piso: queda espacio para entrar caminando.
  const porFila = Math.min(11, Math.max(2, Math.floor((x1 - 64) / COLUMNA) + 1));
  const x0 = x1 - (porFila - 1) * COLUMNA;
  const filas = Math.min(4, Math.max(1, Math.floor((alto - 60) / FILA) + 1));
  return {
    ancho,
    alto,
    entrada: { x: 20, y: alto / 2 },
    salidaX: ancho - 14,
    x0,
    x1,
    filas,
    porFila,
    yFila0: alto / 2 - ((filas - 1) * FILA) / 2,
    mostradorX,
    altoMostrador: Math.min(44, separacion - 6),
    clienteX,
    ys: Array.from({ length: servidores }, (_, k) => alto / 2 + (k - (servidores - 1) / 2) * separacion),
    separacion,
  };
}

/** Lugar del i-ésimo de la fila. La fila va en zigzag: el primero queda arriba a la derecha. */
function puesto(p: Plano, i: number): Punto {
  const fila = Math.floor(i / p.porFila);
  const c = i % p.porFila;
  const paso = fila % 2 === 0 ? c : p.porFila - 1 - c;
  return { x: p.x1 - paso * COLUMNA, y: p.yFila0 + fila * FILA };
}

function Sala({
  foto,
  reloj,
  velocidad,
  lambda,
  unidad,
  letra,
}: {
  foto: Foto;
  reloj: MotionValue<number>;
  velocidad: number;
  lambda: number;
  unidad: Unidad;
  letra: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(600);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setAncho(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const servidores = foto.servidores.length;
  const plano = useMemo(() => hacerPlano(ancho, servidores), [ancho, servidores]);
  const caben = Math.min(foto.cola.length, plano.filas * plano.porFila);
  const afuera = foto.enCola - caben;
  // Al acelerar la simulación la gente camina más rápido, pero no tanto como el reloj.
  const rapidez = 150 * Math.sqrt(velocidad);
  const ritmo = 0.36 / Math.sqrt(velocidad);

  const personas: { cliente: Cliente; destino: Punto; atendido: boolean; salida: TargetAndTransition }[] = [];
  foto.cola.slice(0, caben).forEach((cliente, i) => {
    personas.push({ cliente, destino: puesto(plano, i), atendido: false, salida: { opacity: 0, transition: { duration: 0.15 } } });
  });
  foto.servidores.forEach((cliente, k) => {
    if (!cliente) return;
    const y = plano.ys[k];
    // Al terminar baja al pasillo entre mostradores y camina hacia la salida
    const pasillo = y + (servidores > 1 ? plano.separacion / 2 : 34);
    const duracion = Math.min(1.4, Math.max(0.4, (plano.salidaX - plano.clienteX + 30) / rapidez));
    personas.push({
      cliente,
      destino: { x: plano.clienteX, y },
      atendido: true,
      salida: {
        // null = desde donde esté, por si todavía iba caminando hacia el mostrador
        x: [null, plano.clienteX, plano.salidaX],
        y: [null, pasillo, pasillo],
        opacity: [1, 1, 0],
        transition: {
          x: { duration: duracion, times: [0, 0.22, 1], ease: 'linear' },
          y: { duration: duracion, times: [0, 0.22, 1], ease: 'linear' },
          opacity: { duration: duracion, times: [0, 0.82, 1] },
        },
      },
    });
  });

  return (
    <div ref={ref} className="piso relative overflow-hidden" style={{ height: plano.alto }}>
      <Cintas plano={plano} />

      <Puerta
        x={6}
        y={plano.alto / 2}
        icono={<DoorOpen className="size-4" strokeWidth={1.75} />}
        texto="Entrada"
        dato={`${num(lambda, 2)}/${UNIDADES[unidad].corta}`}
        pulso={foto.ultimaLlegada}
      />
      {afuera > 0 && (
        <div
          className="absolute rounded bg-tinta px-1.5 py-0.5 font-cond text-xs font-semibold text-papel"
          style={{ left: 4, top: plano.alto / 2 - 54 }}
        >
          +{afuera} afuera
        </div>
      )}

      {foto.servidores.map((cliente, k) => (
        <Mostrador
          key={k}
          plano={plano}
          y={plano.ys[k]}
          etiqueta={`${letra}${k + 1}`}
          cliente={cliente}
          reloj={reloj}
        />
      ))}

      <Puerta
        x={plano.ancho - 34}
        y={plano.alto / 2}
        icono={<LogOut className="size-4" strokeWidth={1.75} />}
        texto="Salen"
        dato={String(foto.atendidos)}
      />

      <AnimatePresence>
        {personas.map((p) => (
          <Persona
            key={p.cliente.id}
            cliente={p.cliente}
            destino={p.destino}
            atendido={p.atendido}
            salida={p.salida}
            origen={plano.entrada}
            rapidez={rapidez}
            ritmo={ritmo}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Una persona que camina hasta su lugar. Las piernas solo se mueven mientras va de un lado a otro. */
function Persona({
  cliente,
  destino,
  atendido,
  salida,
  origen,
  rapidez,
  ritmo,
}: {
  cliente: Cliente;
  destino: Punto;
  atendido: boolean;
  salida: TargetAndTransition;
  origen: Punto;
  rapidez: number;
  ritmo: number;
}) {
  const [andando, setAndando] = useState(true);
  const presente = useIsPresent();
  const ultimo = useRef<Punto>(origen);
  const distancia = Math.hypot(destino.x - ultimo.current.x, destino.y - ultimo.current.y);
  useEffect(() => {
    ultimo.current = destino;
  }, [destino]);
  const mover = { duration: Math.min(1.4, Math.max(0.2, distancia / rapidez)), ease: CAMINAR };

  return (
    <motion.div
      className="absolute left-0 top-0"
      style={{
        width: FIG_W,
        height: FIG_H,
        marginLeft: -FIG_W / 2,
        marginTop: -FIG_H / 2,
        zIndex: 20 + Math.round(destino.y),
      }}
      initial={{ x: origen.x, y: origen.y, opacity: 0 }}
      animate={{ x: destino.x, y: destino.y, opacity: 1 }}
      exit={salida}
      transition={{ x: mover, y: mover, opacity: { duration: 0.2, ease: SALIDA } }}
      onAnimationStart={() => setAndando(true)}
      onAnimationComplete={() => setAndando(false)}
    >
      <Figura
        cuerpo={atendido ? 'atendido' : 'fila'}
        piel={PIELES[cliente.id % PIELES.length]}
        numero={turno(cliente.numero)}
        andando={andando || !presente}
        ritmo={ritmo}
        className="size-full"
      />
    </motion.div>
  );
}

/** Las cintas separadoras que arman la fila en zigzag, con el hueco donde la fila da la vuelta. */
function Cintas({ plano }: { plano: Plano }) {
  const izquierda = plano.x0 - 16;
  const derecha = plano.x1 + 16;
  const hueco = 30;
  const cintas = Array.from({ length: plano.filas + 1 }, (_, r) => {
    const y = plano.yFila0 - FILA / 2 + r * FILA;
    if (r === 0 || r === plano.filas) return { y, desde: izquierda, hasta: derecha };
    // entre la vuelta r-1 y la r: si la r-1 iba hacia la izquierda, la vuelta queda a la izquierda
    return (r - 1) % 2 === 0
      ? { y, desde: izquierda + hueco, hasta: derecha }
      : { y, desde: izquierda, hasta: derecha - hueco };
  });
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {cintas.map((c) => (
        <div
          key={c.y}
          className="absolute h-[3px] rounded bg-tinta/30"
          style={{ left: c.desde, width: c.hasta - c.desde, top: c.y - 1.5 }}
        >
          <span className="absolute -left-1 -top-[3.5px] size-2.5 rounded-full bg-tinta" />
          <span className="absolute -right-1 -top-[3.5px] size-2.5 rounded-full bg-tinta" />
        </div>
      ))}
    </div>
  );
}

function Mostrador({
  plano,
  y,
  etiqueta,
  cliente,
  reloj,
}: {
  plano: Plano;
  y: number;
  etiqueta: string;
  cliente: Cliente | null;
  reloj: MotionValue<number>;
}) {
  const alto = plano.altoMostrador;
  return (
    <>
      <div
        className={`absolute z-[5] flex flex-col justify-between rounded-md border-2 bg-papel px-1 py-0.5 transition-colors duration-200 ${
          cliente ? 'border-tinta' : 'border-tinta/20'
        }`}
        style={{ left: plano.mostradorX, top: y - alto / 2, width: 46, height: alto }}
      >
        <span className="font-cond text-sm font-bold leading-none">{etiqueta}</span>
        <div className="h-1.5 overflow-hidden rounded-full bg-tinta/10">
          {cliente && <Progreso key={cliente.id} inicio={cliente.inicio} fin={cliente.fin} reloj={reloj} />}
        </div>
      </div>
      {/* Quien atiende, detrás del mostrador */}
      <div
        className="absolute z-[4]"
        style={{ left: plano.mostradorX + 48, top: y - 17, width: 20, height: 34 }}
      >
        <Figura cuerpo="personal" piel="#d9b08a" className="size-full" />
      </div>
    </>
  );
}

function Puerta({
  x,
  y,
  icono,
  texto,
  dato,
  pulso,
}: {
  x: number;
  y: number;
  icono: ReactNode;
  texto: string;
  dato: string;
  pulso?: number;
}) {
  return (
    <div className="absolute z-[6] flex w-[28px] flex-col items-center" style={{ left: x, top: y - 26 }}>
      <div className="relative grid h-[52px] w-[28px] place-items-center rounded-t-md border-2 border-b-0 border-tinta/40 bg-papel">
        {icono}
        {pulso !== undefined && (
          <motion.span
            key={pulso}
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: SALIDA }}
            className="absolute inset-0 rounded-t-md bg-senal/60"
          />
        )}
      </div>
      <span className="mt-1 whitespace-nowrap text-center text-[11px] leading-tight text-suave">
        {texto}
        <br />
        <b className="font-semibold text-tinta">{dato}</b>
      </span>
    </div>
  );
}

/** Tablero de turnos: parpadea cada vez que llaman a alguien. */
function Tablero({ llamado, enCola, nombreServidor }: { llamado: Llamado | null; enCola: number; nombreServidor: string }) {
  return (
    <div className="grid grid-cols-[auto_auto_1fr] items-end gap-x-5 bg-tablero px-4 pb-3 pt-2.5 sm:gap-x-8 sm:px-5">
      <EtiquetaLed texto="Turno">
        <motion.span
          key={llamado?.id ?? 'nadie'}
          initial={{ opacity: 0.15 }}
          animate={{ opacity: [0.15, 1, 0.3, 1] }}
          transition={{ duration: 0.45, times: [0, 0.3, 0.6, 1], ease: 'linear' }}
          className="led block text-4xl sm:text-5xl"
        >
          {llamado ? turno(llamado.numero) : '---'}
        </motion.span>
      </EtiquetaLed>
      <EtiquetaLed texto={nombreServidor}>
        <span className="led block text-4xl sm:text-5xl">{llamado ? llamado.servidor + 1 : '-'}</span>
      </EtiquetaLed>
      <div className="justify-self-end text-right">
        <EtiquetaLed texto="En fila">
          <span className="led block text-2xl sm:text-3xl">{String(Math.min(enCola, 999)).padStart(2, '0')}</span>
        </EtiquetaLed>
      </div>
    </div>
  );
}

function EtiquetaLed({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <div>
      <div className="font-cond text-xs font-semibold text-white/50">{texto}</div>
      {children}
    </div>
  );
}

function Progreso({ inicio, fin, reloj }: { inicio: number; fin: number; reloj: MotionValue<number> }) {
  const escala = useTransform(reloj, (t) => Math.min(1, Math.max(0, (t - inicio) / (fin - inicio || 1))));
  return <motion.div className="h-full origin-left rounded-full bg-tinta" style={{ scaleX: escala }} />;
}

function Reloj({ reloj, unidad }: { reloj: MotionValue<number>; unidad: Unidad }) {
  const texto = useTransform(reloj, (t) => `${num(t, 1)} ${UNIDADES[unidad].corta}`);
  return <motion.span>{texto}</motion.span>;
}

function Dato({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="border-l-2 border-tinta/15 pl-3">
      <dt className="text-sm text-suave">{titulo}</dt>
      <dd className="font-cond text-3xl font-semibold leading-tight">{children}</dd>
    </div>
  );
}

function BotonIcono({ etiqueta, onClick, children }: { etiqueta: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={etiqueta}
      title={etiqueta}
      className="pulsable grid size-8 place-items-center rounded-lg border border-linea bg-pared text-tinta hover:border-tinta"
    >
      {children}
    </button>
  );
}

function Comparacion({
  teoria,
  stats,
  unidad,
}: {
  teoria: ResultadoOk | null;
  stats: Estadisticas;
  unidad: Unidad;
}) {
  const [abierto, setAbierto] = useState(false);
  const t = (v: number) => tiempo(v, unidad).principal;
  const filas: { nombre: ReactNode; teo: number | undefined; sim: number | null; fmt: (v: number) => string }[] = [
    { nombre: <>Espera en la fila <i>W</i><sub>q</sub></>, teo: teoria?.Wq, sim: stats.Wq, fmt: t },
    { nombre: <>Tiempo total <i>W</i></>, teo: teoria?.W, sim: stats.W, fmt: t },
    { nombre: <>Clientes en la fila <i>L</i><sub>q</sub></>, teo: teoria?.Lq, sim: stats.Lq, fmt: (v) => num(v, 2) },
    { nombre: <>Clientes en el sistema <i>L</i></>, teo: teoria?.L, sim: stats.L, fmt: (v) => num(v, 2) },
    { nombre: <>Ocupación <i>ρ</i></>, teo: teoria?.rho, sim: stats.rho, fmt: (v) => pct(v) },
  ];
  return (
    <div>
      <button
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="tecla pulsable flex items-center gap-2 rounded-lg border border-linea bg-pared px-4 py-2 font-semibold text-tinta hover:border-tinta"
      >
        Comparar con la fórmula
        <motion.span animate={{ rotate: abierto ? 180 : 0 }} transition={{ duration: 0.2, ease: SALIDA }} className="grid">
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
      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 pb-2">
        <h3 className="font-cond text-xl font-bold">Fórmula contra simulación</h3>
        <span className="text-sm text-suave">
          {teoria
            ? `${stats.atendidos} clientes medidos; con más tiempo, la simulación se acerca a la fórmula.`
            : 'Con ρ ≥ 100 % no hay valores teóricos: la fila crece sin parar.'}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-suave">
            <th className="py-2 pr-2 font-medium">Medida</th>
            <th className="px-2 py-2 text-right font-medium">Fórmula</th>
            <th className="py-2 pl-2 text-right font-medium">Simulación</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i} className="border-t border-linea">
              <td className="py-2 pr-2">{f.nombre}</td>
              <td className="px-2 py-2 text-right font-cond text-lg font-bold">
                {f.teo !== undefined ? f.fmt(f.teo) : '—'}
              </td>
              <td className="py-2 pl-2 text-right font-cond text-lg text-suave">
                {f.sim !== null ? f.fmt(f.sim) : '…'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
