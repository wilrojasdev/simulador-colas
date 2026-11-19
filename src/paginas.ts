import { ChartLine, Gauge, LayoutGrid, Sigma, SlidersHorizontal, Users, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

export type PaginaId = 'modelo' | 'datos' | 'sala' | 'resultados' | 'graficas' | 'formulas';

export interface Pagina {
  id: PaginaId;
  /** nombre corto para la barra inferior del celular */
  corto: string;
  titulo: string;
  Icono: LucideIcon;
}

/** El recorrido de la página, en orden: primero el modelo y los datos, al final las fórmulas. */
export const PAGINAS: Pagina[] = [
  { id: 'modelo', corto: 'Modelo', titulo: 'Modelo', Icono: LayoutGrid },
  { id: 'datos', corto: 'Datos', titulo: 'Tus datos', Icono: SlidersHorizontal },
  { id: 'sala', corto: 'Sala', titulo: 'Sala en vivo', Icono: Users },
  { id: 'resultados', corto: 'Resultados', titulo: 'Resultados', Icono: Gauge },
  { id: 'graficas', corto: 'Gráficas', titulo: 'Gráficas', Icono: ChartLine },
  { id: 'formulas', corto: 'Fórmulas', titulo: 'Paso a paso', Icono: Sigma },
];

export const indicePagina = (id: PaginaId) => PAGINAS.findIndex((p) => p.id === id);

function leer(): PaginaId {
  const h = window.location.hash.slice(1);
  return PAGINAS.some((p) => p.id === h) ? (h as PaginaId) : 'modelo';
}

/**
 * Sección actual, guardada en el # de la dirección: así funcionan el botón Atrás y los enlaces.
 * `dir` dice si se avanzó (1) o se retrocedió (-1), para animar el cambio hacia el lado correcto.
 */
export function usePagina(): [{ pagina: PaginaId; dir: 1 | -1 }, (p: PaginaId) => void] {
  const [estado, setEstado] = useState<{ pagina: PaginaId; dir: 1 | -1 }>(() => ({ pagina: leer(), dir: 1 }));

  const cambiar = useCallback((p: PaginaId) => {
    setEstado((prev) =>
      prev.pagina === p ? prev : { pagina: p, dir: indicePagina(p) >= indicePagina(prev.pagina) ? 1 : -1 },
    );
  }, []);

  useEffect(() => {
    const alVolver = () => cambiar(leer());
    window.addEventListener('popstate', alVolver);
    return () => window.removeEventListener('popstate', alVolver);
  }, [cambiar]);

  const ir = useCallback(
    (p: PaginaId) => {
      if (p === leer()) return;
      // pushState en vez de location.hash: no salta a ningún elemento con ese id.
      window.history.pushState(null, '', `#${p}`);
      cambiar(p);
    },
    [cambiar],
  );

  return [estado, ir];
}
