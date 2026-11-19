// Fórmulas exactas de los modelos de colas M/M/1, M/D/1, M/M/s y M/G/1.
// Funciones puras: reciben números y devuelven números, sin nada de interfaz.

export type ModeloId = 'mm1' | 'md1' | 'mms' | 'mg1';

export interface Parametros {
  /** λ: clientes que llegan por unidad de tiempo */
  lambda: number;
  /** μ: clientes que atiende UN servidor por unidad de tiempo */
  mu: number;
  /** s: número de servidores (solo M/M/s) */
  s: number;
  /** σ: desviación estándar del tiempo de servicio (solo M/G/1) */
  sigma: number;
}

export interface ResultadoOk {
  tipo: 'ok';
  servidores: number;
  /** r = λ/μ: servidores ocupados en promedio (carga ofrecida) */
  r: number;
  /** ρ = λ/(sμ): fracción del tiempo que cada servidor está ocupado */
  rho: number;
  /** probabilidad de que el sistema esté vacío */
  P0: number;
  /** probabilidad de que un cliente que llega tenga que esperar */
  Pw: number;
  Lq: number;
  L: number;
  Wq: number;
  W: number;
  /** 1/μ: tiempo promedio de servicio */
  tServicio: number;
}

export interface ResultadoInestable {
  tipo: 'inestable';
  servidores: number;
  rho: number;
  /** sμ: clientes que el sistema puede atender por unidad de tiempo */
  capacidad: number;
}

export interface ResultadoInvalido {
  tipo: 'invalido';
  mensaje: string;
}

export type Resultado = ResultadoOk | ResultadoInestable | ResultadoInvalido;

export function servidoresDe(modelo: ModeloId, p: Parametros): number {
  return modelo === 'mms' ? Math.round(p.s) : 1;
}

function validar(modelo: ModeloId, p: Parametros): string | null {
  if (!Number.isFinite(p.lambda) || p.lambda <= 0) return 'La tasa de llegada λ debe ser mayor que 0.';
  if (!Number.isFinite(p.mu) || p.mu <= 0) return 'La tasa de servicio μ debe ser mayor que 0.';
  if (modelo === 'mms' && (!Number.isFinite(p.s) || Math.round(p.s) < 1))
    return 'El número de servidores s debe ser un entero mayor o igual a 1.';
  if (modelo === 'mg1' && (!Number.isFinite(p.sigma) || p.sigma < 0))
    return 'La desviación estándar σ no puede ser negativa.';
  return null;
}

/**
 * Términos de M/M/s calculados sin factoriales grandes: cada término sale del anterior
 * (r^(n+1)/(n+1)! = r^n/n! · r/(n+1)), así no se desborda con muchos servidores.
 */
export function terminosMMs(r: number, s: number) {
  let termino = 1; // r^n / n!
  let suma = 0; // Σ_{n=0}^{s-1} r^n / n!
  for (let n = 0; n < s; n++) {
    suma += termino;
    termino *= r / (n + 1);
  }
  const rho = r / s;
  const ultimo = termino / (1 - rho); // r^s / (s! (1-ρ))
  const P0 = 1 / (suma + ultimo);
  return { suma, ultimo, P0, Pw: ultimo * P0 };
}

export function calcular(modelo: ModeloId, p: Parametros): Resultado {
  const error = validar(modelo, p);
  if (error) return { tipo: 'invalido', mensaje: error };

  const s = servidoresDe(modelo, p);
  const r = p.lambda / p.mu;
  const rho = r / s;
  if (rho >= 1) return { tipo: 'inestable', servidores: s, rho, capacidad: s * p.mu };

  let P0: number;
  let Pw: number;
  let Lq: number;
  switch (modelo) {
    case 'mm1':
      P0 = 1 - rho;
      Pw = rho;
      Lq = (rho * rho) / (1 - rho);
      break;
    case 'md1':
      P0 = 1 - rho;
      Pw = rho;
      Lq = (rho * rho) / (2 * (1 - rho));
      break;
    case 'mg1':
      // Pollaczek-Khinchine
      P0 = 1 - rho;
      Pw = rho;
      Lq = (p.lambda ** 2 * p.sigma ** 2 + rho ** 2) / (2 * (1 - rho));
      break;
    case 'mms': {
      const t = terminosMMs(r, s);
      P0 = t.P0;
      Pw = t.Pw; // Erlang C
      Lq = (Pw * rho) / (1 - rho);
      break;
    }
  }

  // Ley de Little y tiempo de servicio
  const Wq = Lq / p.lambda;
  const W = Wq + 1 / p.mu;
  const L = p.lambda * W;
  return { tipo: 'ok', servidores: s, r, rho, P0, Pw, Lq, L, Wq, W, tServicio: 1 / p.mu };
}

/** P(n clientes en el sistema), solo donde hay fórmula cerrada: M/M/1 y M/M/s. */
export function distribucionN(modelo: ModeloId, p: Parametros, maxN = 30): number[] | null {
  if (modelo !== 'mm1' && modelo !== 'mms') return null;
  const res = calcular(modelo, p);
  if (res.tipo !== 'ok') return null;
  const { servidores: s, r, P0 } = res;
  const out: number[] = [];
  let pn = P0;
  let acumulado = 0;
  for (let n = 0; n <= maxN; n++) {
    if (n > 0) pn *= n <= s ? r / n : r / s;
    out.push(pn);
    acumulado += pn;
    if (acumulado >= 0.99 && n >= Math.max(s + 1, 5)) break;
  }
  return out;
}

export interface PuntoCurva {
  rho: number;
  Lq: number;
  Wq: number;
}

/** Cómo cambian Lq y Wq si aumenta λ y todo lo demás se queda igual. */
export function curvaCarga(modelo: ModeloId, p: Parametros, puntos = 60): PuntoCurva[] {
  const s = servidoresDe(modelo, p);
  const capacidad = s * p.mu;
  if (!(capacidad > 0)) return [];
  const actual = p.lambda / capacidad;
  const maxRho = actual >= 1 ? 0.95 : Math.min(0.99, Math.max(0.9, actual + 0.04));
  const datos: PuntoCurva[] = [];
  for (let i = 1; i <= puntos; i++) {
    const rho = (maxRho * i) / puntos;
    const res = calcular(modelo, { ...p, lambda: rho * capacidad });
    if (res.tipo === 'ok') datos.push({ rho, Lq: res.Lq, Wq: res.Wq });
  }
  return datos;
}

export interface CasoVariabilidad {
  nombre: string;
  sigma: number;
  Lq: number;
  actual: boolean;
}

/** Misma λ y misma media de servicio, distinta variabilidad: muestra por qué M/D/1 tiene menos fila. */
export function comparacionVariabilidad(modelo: ModeloId, p: Parametros): CasoVariabilidad[] {
  const tS = 1 / p.mu;
  const casos: Omit<CasoVariabilidad, 'Lq'>[] = [
    { nombre: 'Fijo (M/D/1)', sigma: 0, actual: modelo === 'md1' },
    ...(modelo === 'mg1' ? [{ nombre: 'Tu caso (M/G/1)', sigma: p.sigma, actual: true }] : []),
    { nombre: 'Exponencial (M/M/1)', sigma: tS, actual: false },
    { nombre: 'Muy variable (σ = 2/μ)', sigma: 2 * tS, actual: false },
  ];
  return casos
    .map((c) => {
      const res = calcular('mg1', { ...p, sigma: c.sigma });
      return { ...c, Lq: res.tipo === 'ok' ? res.Lq : NaN };
    })
    .filter((c) => Number.isFinite(c.Lq))
    .sort((a, b) => a.sigma - b.sigma);
}
