export type Unidad = 'h' | 'min';

export const UNIDADES: Record<Unidad, { nombre: string; plural: string; corta: string }> = {
  h: { nombre: 'hora', plural: 'horas', corta: 'h' },
  min: { nombre: 'minuto', plural: 'minutos', corta: 'min' },
};

const cache = new Map<string, Intl.NumberFormat>();
function formateador(opciones: Intl.NumberFormatOptions): Intl.NumberFormat {
  const clave = JSON.stringify(opciones);
  let f = cache.get(clave);
  if (!f) {
    f = new Intl.NumberFormat('es-CO', opciones);
    cache.set(clave, f);
  }
  return f;
}

/** Número con coma decimal (3,25). Muestra más decimales si el número es muy pequeño. */
export function num(n: number, decimales = 3): string {
  if (!Number.isFinite(n)) return '∞';
  const d = n !== 0 && Math.abs(n) < 0.01 ? Math.max(decimales, 5) : decimales;
  return formateador({ maximumFractionDigits: d }).format(n);
}

export function pct(x: number, decimales = 1): string {
  if (!Number.isFinite(x)) return '—';
  return formateador({ style: 'percent', maximumFractionDigits: decimales }).format(x);
}

/** Número para KaTeX: sin separador de miles y con la coma protegida. */
export function tex(n: number, decimales = 4): string {
  if (!Number.isFinite(n)) return '\\infty';
  const d = n !== 0 && Math.abs(n) < 0.001 ? 6 : decimales;
  return formateador({ maximumFractionDigits: d, useGrouping: false }).format(n).replace(',', '{,}');
}

/** "1 h 12 min", "4 min 30 s"… para leer un tiempo sin hacer cuentas. */
export function duracionLegible(minutos: number): string {
  if (!Number.isFinite(minutos)) return '∞';
  const seg = Math.round(minutos * 60);
  if (seg < 60) return `${seg} s`;
  if (seg < 3600) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return s ? `${m} min ${s} s` : `${m} min`;
  }
  const totalMin = Math.round(seg / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function tiempo(valor: number, u: Unidad): { principal: string; legible: string } {
  return {
    principal: `${num(valor)} ${UNIDADES[u].corta}`,
    legible: duracionLegible(u === 'h' ? valor * 60 : valor),
  };
}
