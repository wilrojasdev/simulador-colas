import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Simulacion, type ConfigSim, type Foto } from '../lib/simulacion';

const W = 240;
/** lugares de la fila que se dibujan; el resto se resume en "+n" */
const CAP = 9;
const MOVER = { duration: 0.55, ease: [0.645, 0.045, 0.355, 1] } as const;
const SALIR = { duration: 0.6, ease: [0.4, 0, 1, 1] } as const;

/** Una persona diminuta con los pies en (0, 0). */
function Gente({ atendida }: { atendida: boolean }) {
  return (
    <>
      <rect x={-3.6} y={-8} width={3} height={8} rx={1.5} />
      <rect x={0.6} y={-8} width={3} height={8} rx={1.5} />
      <rect x={-5} y={-17.5} width={10} height={11} rx={4} fillOpacity={atendida ? 1 : 0.62} />
      <circle cx={0} cy={-21} r={3.7} />
    </>
  );
}

/**
 * Una fila en miniatura que corre de verdad: usa el mismo motor de simulación que la sala, así
 * que M/D/1 atiende parejo, M/G/1 a veces se demora muchísimo y M/M/s reparte entre varios.
 * Se dibuja con `currentColor` para tomar el color de donde esté.
 */
export function MiniFila({
  conf,
  ritmo = 0.5,
  etiqueta,
  alto = 88,
  className,
}: {
  conf: ConfigSim;
  /** llegadas por segundo real */
  ritmo?: number;
  etiqueta: string;
  /** alto mínimo del dibujo (en unidades del viewBox de 240 de ancho) */
  alto?: number;
  className?: string;
}) {
  const sv = conf.servidores;
  const valido = conf.lambda > 0 && conf.mu > 0 && sv > 0;
  const tramo = 24 * (sv - 1);
  const H = Math.max(alto, tramo + 40);
  const pie = (k: number) => (H - tramo) / 2 + 12 + 24 * k;
  const yFila = (pie(0) + pie(sv - 1)) / 2;
  const xAtendida = W - 54;
  const xLugar = (i: number) => xAtendida - 22 - 16 * i;

  const sim = useRef<Simulacion | null>(null);
  const confRef = useRef(conf);
  confRef.current = conf;
  const ritmoRef = useRef(ritmo);
  ritmoRef.current = ritmo;
  const [foto, setFoto] = useState<Foto | null>(null);
  const barras = useRef<(SVGRectElement | null)[]>([]);
  const lienzo = useRef<SVGSVGElement>(null);
  const quieta = useReducedMotion();

  // Otra cantidad de servidores es otra sala: se empieza de nuevo, ya con algo de gente adentro.
  useEffect(() => {
    if (!valido) {
      sim.current = null;
      setFoto(null);
      return;
    }
    const s = new Simulacion(confRef.current);
    s.avanzar(5 / confRef.current.lambda);
    sim.current = s;
    setFoto(s.foto(CAP));
  }, [sv, valido]);

  // Si solo cambian λ, μ o σ, la fila sigue y se ajusta al nuevo ritmo.
  useEffect(() => {
    sim.current?.configurar(conf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conf.lambda, conf.mu, conf.dist, conf.sigma]);

  useEffect(() => {
    if (quieta || !valido) return;
    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
    });
    if (lienzo.current) io.observe(lienzo.current);
    let raf = 0;
    let previo = performance.now();
    const paso = (ahora: number) => {
      raf = requestAnimationFrame(paso);
      const dt = Math.min((ahora - previo) / 1000, 0.1);
      previo = ahora;
      const s = sim.current;
      if (!s || !visible) return;
      if (s.avanzar(s.t + (dt * ritmoRef.current) / confRef.current.lambda)) setFoto(s.foto(CAP));
      s.servidores.forEach((c, k) => {
        const b = barras.current[k];
        if (!b) return;
        const p = c ? Math.min(1, Math.max(0, (s.t - c.inicio) / (c.fin - c.inicio || 1))) : 0;
        b.style.transform = `scaleX(${p})`;
      });
    };
    raf = requestAnimationFrame(paso);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [quieta, valido]);

  const gente: { id: number; x: number; y: number; atendida: boolean }[] = [];
  foto?.cola.forEach((c, i) => gente.push({ id: c.id, x: xLugar(i), y: yFila, atendida: false }));
  foto?.servidores.forEach((c, k) => c && gente.push({ id: c.id, x: xAtendida, y: pie(k), atendida: true }));
  const sobran = foto ? foto.enCola - foto.cola.length : 0;

  return (
    <svg ref={lienzo} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={etiqueta} className={className} fill="currentColor">
      {/* piso de la fila */}
      <line x1={20} x2={xAtendida - 12} y1={yFila + 2.5} y2={yFila + 2.5} stroke="currentColor" strokeOpacity={0.22} strokeWidth={1.5} strokeDasharray="2 4" />

      {Array.from({ length: sv }, (_, k) => {
        const y = pie(k);
        return (
          <g key={k}>
            {/* quien atiende, detrás del mostrador */}
            <g transform={`translate(${W - 24} ${y - 3})`} opacity={0.5}>
              <Gente atendida />
            </g>
            <rect x={W - 41} y={y - 14} width={28} height={13} rx={3} fillOpacity={0.24} />
            <rect x={W - 41} y={y + 1.5} width={28} height={3} rx={1.5} fillOpacity={0.18} />
            <rect
              ref={(el) => {
                barras.current[k] = el;
              }}
              x={W - 41}
              y={y + 1.5}
              width={28}
              height={3}
              rx={1.5}
              style={{ transformBox: 'fill-box', transformOrigin: 'left', transform: 'scaleX(0)' }}
            />
          </g>
        );
      })}

      <AnimatePresence initial={false}>
        {gente.map((g) => (
          <motion.g
            key={g.id}
            initial={{ x: -14, y: yFila, opacity: 0 }}
            animate={{ x: g.x, y: g.y, opacity: 1 }}
            exit={{ x: W + 14, opacity: 0, transition: SALIR }}
            transition={MOVER}
          >
            <Gente atendida={g.atendida} />
          </motion.g>
        ))}
      </AnimatePresence>

      {sobran > 0 && (
        <text x={6} y={yFila - 6} fontSize={11} fontWeight={700} fontFamily="Barlow Condensed, sans-serif">
          +{sobran}
        </text>
      )}
    </svg>
  );
}
