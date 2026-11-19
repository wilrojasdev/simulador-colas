import { AnimatePresence, MotionConfig, motion, type Variants } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SALIDA, TituloSeccion } from './components/Basicos';
import { Encabezado } from './components/Encabezado';
import { Escena } from './components/Escena';
import { Graficas } from './components/Graficas';
import { GuiaDatos, type Dato } from './components/GuiaDatos';
import { LetrasModelo, SelectorModelo, TarjetasModelo } from './components/Modelo';
import { BarraInferior, EncabezadoPaso, HojaDatos, Paginador, ResumenDatos } from './components/Navegacion';
import { Parametros } from './components/Parametros';
import { PasoAPaso } from './components/PasoAPaso';
import { Resultados } from './components/Resultados';
import { calcular, type ModeloId, type Parametros as P } from './lib/colas';
import type { Unidad } from './lib/formato';
import { MODELOS } from './modelos';
import { usePagina, type PaginaId } from './paginas';
import { TemaContexto } from './temas';

/** Cambio de sección: la nueva entra desde el lado hacia donde se avanza; la vieja sale rápido. */
const CAMBIO: Variants = {
  entra: (dir: number) => ({ opacity: 0, x: dir * 28 }),
  quieta: { opacity: 1, x: 0, transition: { duration: 0.3, ease: SALIDA } },
  sale: (dir: number) => ({ opacity: 0, x: dir * -20, transition: { duration: 0.15, ease: [0.4, 0, 1, 1] } }),
};

export default function App() {
  const [modelo, setModelo] = useState<ModeloId>('mm1');
  const [params, setParams] = useState<P>({ lambda: 8, mu: 10, s: 2, sigma: 0.08 });
  const [unidad, setUnidad] = useState<Unidad>('h');
  const [{ pagina, dir }, irA] = usePagina();
  const [ajustando, setAjustando] = useState(false);
  const [foco, setFoco] = useState<Dato | null>(null);

  // La sala 3D pesa: se descarga mientras el usuario todavía está llenando sus datos.
  useEffect(() => {
    const t = window.setTimeout(() => void import('./components/sala3d/Sala3D'), 1200);
    return () => window.clearTimeout(t);
  }, []);

  const info = MODELOS[modelo];
  const resultado = useMemo(() => calcular(modelo, params), [modelo, params]);

  const cambiar = (p: Partial<P>) => setParams((prev) => ({ ...prev, ...p }));
  const cargarEjemplo = () => {
    cambiar(info.ejemplo.params);
    setUnidad(info.ejemplo.unidad);
  };
  const ir = useCallback(
    (p: PaginaId) => {
      setAjustando(false);
      irA(p);
    },
    [irA],
  );
  const cerrarAjustes = useCallback(() => setAjustando(false), []);

  const datos = (
    <Parametros
      modelo={modelo}
      params={params}
      onCambio={cambiar}
      unidad={unidad}
      onUnidad={setUnidad}
      resultado={resultado}
      onEjemplo={cargarEjemplo}
      onFoco={setFoco}
    />
  );
  const resumen = (
    <ResumenDatos modelo={modelo} params={params} unidad={unidad} resultado={resultado} onAjustar={() => setAjustando(true)} />
  );

  const secciones: Record<PaginaId, ReactNode> = {
    modelo: (
      <>
        <Encabezado />
        <section aria-label="Modelo">
          <TarjetasModelo modelo={modelo} onCambio={setModelo} />
          <LetrasModelo modelo={modelo} />
        </section>
      </>
    ),
    datos: (
      <>
        <EncabezadoPaso
          pagina="datos"
          titulo="¿Cómo es tu fila?"
          texto={`Pon cuántos llegan y qué tan rápido se atiende en tu ${info.nombre}. Con estos números se calcula todo lo que viene después.`}
        />
        <section className="grid items-start gap-6 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          {datos}
          <GuiaDatos modelo={modelo} unidad={unidad} foco={foco} onFoco={setFoco} />
        </section>
      </>
    ),
    sala: (
      <>
        {resumen}
        <Escena modelo={modelo} params={params} unidad={unidad} resultado={resultado} />
      </>
    ),
    resultados: (
      <>
        {resumen}
        <TituloSeccion titulo="Resultados" subtitulo={`Medidas de desempeño de ${info.nombre}, explicadas en palabras.`} />
        <Resultados modelo={modelo} params={params} resultado={resultado} unidad={unidad} />
      </>
    ),
    graficas: (
      <>
        {resumen}
        <TituloSeccion titulo="Gráficas" subtitulo="Cómo se comporta tu sistema si cambian las condiciones." />
        <Graficas modelo={modelo} params={params} resultado={resultado} unidad={unidad} />
      </>
    ),
    formulas: (
      <>
        {resumen}
        <PasoAPaso modelo={modelo} params={params} resultado={resultado} unidad={unidad} />
        <p className="mt-10 max-w-3xl text-sm text-suave">
          Fórmulas exactas: ley de Little, Pollaczek-Khinchine (M/G/1 y M/D/1) y Erlang C (M/M/s). La simulación usa
          números aleatorios; en M/G/1 la atención sigue una distribución lognormal con tu media y tu desviación.
        </p>
      </>
    ),
  };

  return (
    <TemaContexto.Provider value="arcilla">
      <MotionConfig reducedMotion="user">
        <main className="mx-auto max-w-7xl px-4 pb-32 sm:px-6 lg:px-8">
          <AnimatePresence
            mode="wait"
            initial={false}
            custom={dir}
            onExitComplete={() => window.scrollTo({ top: 0, behavior: 'instant' })}
          >
            <motion.div key={pagina} custom={dir} variants={CAMBIO} initial="entra" animate="quieta" exit="sale">
              {secciones[pagina]}
              <Paginador pagina={pagina} onIr={ir} />
            </motion.div>
          </AnimatePresence>
        </main>
        <BarraInferior pagina={pagina} onIr={ir} />
        <HojaDatos abierta={ajustando} onCerrar={cerrarAjustes}>
          <SelectorModelo modelo={modelo} onCambio={setModelo} compacto />
          {datos}
        </HojaDatos>
      </MotionConfig>
    </TemaContexto.Provider>
  );
}
