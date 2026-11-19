import { ArrowLeft, ArrowRight, SlidersHorizontal, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ModeloId, Parametros, Resultado } from '../lib/colas';
import { num, pct, UNIDADES, type Unidad } from '../lib/formato';
import { MODELOS } from '../modelos';
import { indicePagina, PAGINAS, type PaginaId } from '../paginas';
import { SALIDA } from './Basicos';

const RESORTE = { type: 'spring', stiffness: 500, damping: 40 } as const;

/**
 * Las secciones van abajo: en el celular, una barra al alcance del pulgar, como en una app;
 * en pantallas grandes, un dock flotante que no tapa el contenido.
 */
export function BarraInferior({ pagina, onIr }: { pagina: PaginaId; onIr: (p: PaginaId) => void }) {
  return (
    <nav
      aria-label="Secciones"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-linea bg-papel/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:bottom-5 lg:left-1/2 lg:right-auto lg:-translate-x-1/2 lg:rounded-2xl lg:border lg:pb-0 lg:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.35)]"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-6 lg:flex lg:max-w-none lg:gap-0.5 lg:p-1.5">
        {PAGINAS.map((p) => {
          const activa = p.id === pagina;
          return (
            <li key={p.id}>
              <button
                onClick={() => onIr(p.id)}
                aria-current={activa ? 'page' : undefined}
                className="pulsable group flex w-full flex-col items-center gap-0.5 pb-1.5 pt-2 text-[11px] font-semibold lg:w-[84px] lg:rounded-xl lg:pb-1 lg:pt-1.5"
              >
                <span className="relative grid h-8 w-11 place-items-center">
                  {activa && (
                    <motion.span layoutId="pagina-activa-movil" className="absolute inset-0 rounded-full bg-senal" transition={RESORTE} />
                  )}
                  <p.Icono
                    aria-hidden
                    size={20}
                    strokeWidth={activa ? 2.4 : 2}
                    className={`relative transition-colors duration-200 ${activa ? 'text-sobresenal' : 'text-suave group-hover:text-tinta'}`}
                  />
                </span>
                <span className={`transition-colors duration-200 ${activa ? 'text-tinta' : 'text-suave group-hover:text-tinta'}`}>{p.corto}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Al final de cada sección: volver a la anterior o seguir con la próxima. */
export function Paginador({ pagina, onIr }: { pagina: PaginaId; onIr: (p: PaginaId) => void }) {
  const i = indicePagina(pagina);
  const anterior = PAGINAS[i - 1];
  const siguiente = PAGINAS[i + 1];
  return (
    <nav aria-label="Cambiar de sección" className="mt-14 flex flex-wrap items-center gap-3">
      {anterior && (
        <button
          onClick={() => onIr(anterior.id)}
          className="tecla group flex items-center gap-3 rounded-xl border border-linea bg-papel py-2.5 pl-3 pr-4 text-left"
        >
          <ArrowLeft aria-hidden size={18} className="text-suave transition-transform duration-200 group-hover:-translate-x-0.5" />
          <span>
            <span className="block text-xs font-semibold text-suave">Anterior</span>
            <span className="block font-cond text-xl font-bold leading-tight">{anterior.titulo}</span>
          </span>
        </button>
      )}
      {siguiente && (
        <button
          onClick={() => onIr(siguiente.id)}
          className="tecla group ml-auto flex items-center gap-3 rounded-xl bg-senal py-2.5 pl-5 pr-4 text-right text-sobresenal"
        >
          <span>
            <span className="block text-xs font-semibold opacity-75">Siguiente · {indicePagina(siguiente.id) + 1} de {PAGINAS.length}</span>
            <span className="block font-cond text-2xl font-bold leading-tight">{siguiente.titulo}</span>
          </span>
          <ArrowRight aria-hidden size={22} className="transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      )}
    </nav>
  );
}

/** Recordatorio de los datos con que se calcula todo, con un botón para ajustarlos sin cambiar de sección. */
export function ResumenDatos({
  modelo,
  params,
  unidad,
  resultado,
  onAjustar,
}: {
  modelo: ModeloId;
  params: Parametros;
  unidad: Unidad;
  resultado: Resultado;
  onAjustar: () => void;
}) {
  const u = UNIDADES[unidad];
  // [símbolo, valor, lo que solo se lee cuando hay espacio]
  const datos: [string, string, string][] = [
    ['λ', num(params.lambda), ` por ${u.nombre}`],
    ['μ', num(params.mu), ` por ${u.nombre}`],
  ];
  if (modelo === 'mms') datos.push(['s', String(params.s), ' servidores']);
  if (modelo === 'mg1') datos.push(['σ', num(params.sigma), ` ${u.corta}`]);
  const rho = resultado.tipo === 'invalido' ? null : resultado.rho;

  return (
    <div className="panel mb-6 mt-5 flex items-center gap-x-3 px-2.5 py-2 sm:mb-8 sm:mt-10 sm:gap-x-5 sm:px-4 sm:py-2.5">
      <span className="shrink-0 rounded-lg bg-senal px-2 py-0.5 font-cond text-lg font-bold text-sobresenal sm:px-2.5 sm:text-xl">
        {MODELOS[modelo].nombre}
      </span>
      <dl className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1 sm:gap-x-5">
        {datos.map(([simbolo, valor, extra]) => (
          <div key={simbolo} className="flex items-baseline gap-1">
            <dt className="font-cond text-lg font-bold">{simbolo}</dt>
            <dd className="text-sm font-semibold">
              {valor}
              <span className="hidden sm:inline">{extra}</span>
            </dd>
          </div>
        ))}
        {rho !== null && (
          <div className="flex items-baseline gap-1">
            <dt className="font-cond text-lg font-bold">ρ</dt>
            <dd className={`text-sm font-semibold ${rho >= 1 ? 'text-alerta' : ''}`}>
              {pct(rho, 0)}
              <span className="hidden sm:inline"> {rho >= 1 ? '· se desborda' : 'de ocupación'}</span>
            </dd>
          </div>
        )}
      </dl>
      <button
        onClick={onAjustar}
        aria-label="Ajustar datos"
        className="tecla ml-auto flex shrink-0 items-center gap-2 rounded-lg bg-tinta p-2 text-sm font-semibold text-papel sm:px-3 sm:py-1.5"
      >
        <SlidersHorizontal aria-hidden size={16} />
        <span className="hidden sm:inline">Ajustar datos</span>
      </button>
    </div>
  );
}

function usePantallaGrande() {
  const consulta = '(min-width: 1024px)';
  const [grande, setGrande] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const f = () => setGrande(m.matches);
    m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return grande;
}

/**
 * Panel para cambiar los datos desde cualquier sección: entra por la derecha en pantallas grandes
 * (la sala sigue a la vista) y desde abajo en el celular.
 */
export function HojaDatos({ abierta, onCerrar, children }: { abierta: boolean; onCerrar: () => void; children: ReactNode }) {
  const lateral = usePantallaGrande();
  const boton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!abierta) return;
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    window.addEventListener('keydown', tecla);
    boton.current?.focus();
    return () => window.removeEventListener('keydown', tecla);
  }, [abierta, onCerrar]);

  const fuera = lateral ? { x: '100%' } : { y: '100%' };
  return (
    <AnimatePresence>
      {abierta && (
        <>
          <motion.div
            key="fondo"
            aria-hidden
            onClick={onCerrar}
            className="fixed inset-0 z-50 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.aside
            key="hoja"
            role="dialog"
            aria-modal="true"
            aria-label="Ajustar datos"
            className="fixed inset-x-0 bottom-0 z-50 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-2xl bg-pared shadow-2xl lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[400px] lg:rounded-l-2xl lg:rounded-tr-none"
            initial={fuera}
            animate={{ x: 0, y: 0, transition: { duration: 0.38, ease: SALIDA } }}
            exit={{ ...fuera, transition: { duration: 0.24, ease: [0.4, 0, 1, 1] } }}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-linea bg-pared/90 px-4 py-3 backdrop-blur-md">
              <span aria-hidden className="absolute left-1/2 top-1.5 h-1 w-10 -translate-x-1/2 rounded-full bg-linea lg:hidden" />
              <h2 className="font-cond text-2xl font-bold">Ajustar datos</h2>
              <button
                ref={boton}
                onClick={onCerrar}
                aria-label="Cerrar"
                className="pulsable grid size-9 place-items-center rounded-full bg-papel text-suave hover:text-tinta"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col gap-4 p-4">{children}</div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** Encabezado corto de una sección: en qué paso va, qué se hace aquí y para qué. */
export function EncabezadoPaso({ pagina, titulo, texto }: { pagina: PaginaId; titulo: string; texto: string }) {
  return (
    <header className="pb-6 pt-8 sm:pt-10">
      <p className="font-cond text-lg font-semibold text-suave">
        Paso {indicePagina(pagina) + 1} de {PAGINAS.length}
      </p>
      <h1 className="mt-1 font-cond text-4xl font-bold leading-none sm:text-6xl">{titulo}</h1>
      <p className="mt-3 max-w-2xl text-lg text-suave">{texto}</p>
    </header>
  );
}
