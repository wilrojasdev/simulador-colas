/**
 * Plano de la sala en 3D, visto desde arriba: x va de la pared izquierda (0) a la derecha (ancho),
 * z va de la pared del fondo (0) hacia el frente (fondo). Todo en metros "de maqueta".
 *
 *   pared del fondo:  [V1] [V2] [V3]  ...  puerta de salida
 *                      clientes atendidos
 *   pasillo  ───────────────────────────────
 *   fila en zigzag (3 vueltas, la cabeza arriba a la derecha)
 *   puerta de entrada en la pared izquierda, a la altura de la última vuelta
 */

export interface Punto {
  x: number;
  z: number;
}

export interface Plano3D {
  ancho: number;
  fondo: number;
  alturaPared: number;
  /** distancia entre dos personas de la fila (y entre vueltas) */
  paso: number;
  porFila: number;
  filas: number;
  capacidad: number;
  x0: number;
  x1: number;
  zFilas: number[];
  zMostrador: number;
  zPersonal: number;
  zCliente: number;
  zPasillo: number;
  mostradores: number[];
  /** x del pasillo lateral izquierdo, entre la pared y la fila */
  xLateral: number;
  /** x de la salida en la pared del fondo */
  xSalida: number;
  /** z de la entrada en la pared izquierda */
  zEntrada: number;
  /** recorrido de la fila: de la cabeza a la entrada del zigzag */
  recorrido: Punto[];
  /** distancia a lo largo del recorrido de cada esquina */
  marcas: number[];
}

const PASO = 0.72;
const POR_FILA = 6;
const FILAS = 3;
const ENTRE_MOSTRADORES = 1.35;

export function hacerPlano3D(servidores: number): Plano3D {
  const x0 = 2.1;
  const x1 = x0 + (POR_FILA - 1) * PASO;
  const zFilas = Array.from({ length: FILAS }, (_, r) => 3.1 + r * PASO);
  const zEntrada = zFilas[FILAS - 1];
  const tramo = (servidores - 1) * ENTRE_MOSTRADORES;
  const xm0 = Math.max(1.6, x1 + 0.7 - tramo / 2);
  const mostradores = Array.from({ length: servidores }, (_, k) => xm0 + k * ENTRE_MOSTRADORES);
  const xSalida = mostradores[servidores - 1] + 1.45;
  const ancho = Math.max(x1 + 2.6, xSalida + 1.1);

  // Zigzag: la vuelta 0 va de derecha a izquierda, la 1 de izquierda a derecha, la 2 otra vez a la izquierda.
  const recorrido: Punto[] = [];
  zFilas.forEach((z, r) => {
    const [a, b] = r % 2 === 0 ? [x1, x0] : [x0, x1];
    recorrido.push({ x: a, z }, { x: b, z });
  });
  const ultimo = recorrido[recorrido.length - 1];
  recorrido.push({ x: ultimo.x + (FILAS % 2 === 1 ? -PASO : PASO), z: ultimo.z });

  const marcas = [0];
  for (let i = 1; i < recorrido.length; i++) {
    marcas.push(marcas[i - 1] + Math.hypot(recorrido[i].x - recorrido[i - 1].x, recorrido[i].z - recorrido[i - 1].z));
  }

  return {
    ancho,
    fondo: 5.6,
    alturaPared: 2.5,
    paso: PASO,
    porFila: POR_FILA,
    filas: FILAS,
    capacidad: POR_FILA * FILAS,
    x0,
    x1,
    zFilas,
    zMostrador: 0.85,
    zPersonal: 0.36,
    zCliente: 1.62,
    zPasillo: 2.36,
    mostradores,
    xLateral: 0.95,
    xSalida,
    zEntrada,
    recorrido,
    marcas,
  };
}

/** Distancia, a lo largo del recorrido, del lugar número i de la fila (0 = el primero). */
export function distanciaPuesto(p: Plano3D, i: number): number {
  return i * p.paso;
}

/** Distancia del punto por donde se entra al zigzag. */
export function distanciaEntrada(p: Plano3D): number {
  return p.marcas[p.marcas.length - 1];
}

/** Punto del recorrido a una distancia s de la cabeza. */
export function puntoRecorrido(p: Plano3D, s: number): Punto {
  const { recorrido: r, marcas: m } = p;
  if (s <= 0) return { ...r[0] };
  for (let i = 1; i < r.length; i++) {
    if (s <= m[i]) {
      const t = (s - m[i - 1]) / (m[i] - m[i - 1] || 1);
      return { x: r[i - 1].x + (r[i].x - r[i - 1].x) * t, z: r[i - 1].z + (r[i].z - r[i - 1].z) * t };
    }
  }
  return { ...r[r.length - 1] };
}

/** Camino desde la cabeza de la fila hasta el lugar del cliente frente al mostrador k. */
export function caminoAlMostrador(p: Plano3D, k: number): Punto[] {
  const x = p.mostradores[k] ?? p.mostradores[0];
  const salidaFila = p.x1 + 0.75;
  return [
    { x: salidaFila, z: p.zFilas[0] },
    { x: salidaFila, z: p.zPasillo },
    { x, z: p.zPasillo },
    { x, z: p.zCliente },
  ];
}

/** Camino de quien llega y encuentra un mostrador libre: por el pasillo lateral, sin cruzar la fila. */
export function caminoDirecto(p: Plano3D, k: number): Punto[] {
  const x = p.mostradores[k] ?? p.mostradores[0];
  return [
    { x: p.xLateral, z: p.zEntrada },
    { x: p.xLateral, z: p.zPasillo },
    { x, z: p.zPasillo },
    { x, z: p.zCliente },
  ];
}

/** Camino de salida desde donde esté hasta afuera, por la puerta del fondo. */
export function caminoSalida(p: Plano3D, desde: Punto): Punto[] {
  return [
    { x: desde.x, z: p.zPasillo },
    { x: p.xSalida, z: p.zPasillo },
    { x: p.xSalida, z: 0.3 },
    { x: p.xSalida, z: -1.1 },
  ];
}

/**
 * Cómo entra a la fila quien llega. Como en un banco de verdad, las cintas de los extremos se
 * recogen para abrir un atajo: si la fila cabe en la primera vuelta se entra por la izquierda de esa
 * vuelta; si llega a la segunda, por la derecha de la segunda; si no, por la entrada del zigzag.
 */
export function vueltaDeEntrada(p: Plano3D, enFila: number): number {
  return Math.min(p.filas, Math.floor(Math.min(enFila, p.capacidad) / p.porFila) + 1);
}

export function entradaPara(p: Plano3D, puesto: number): { ruta: Punto[]; s: number } {
  const vuelta = Math.min(p.filas, Math.floor(puesto / p.porFila) + 1);
  const [z0, z1] = p.zFilas;
  const puerta = { x: 0.3, z: p.zEntrada };
  if (vuelta === 1) {
    const s = (p.porFila - 1) * p.paso;
    return {
      ruta: [puerta, { x: p.xLateral, z: p.zEntrada }, { x: p.xLateral, z: z0 }, { x: p.x0 - 0.7, z: z0 }, puntoRecorrido(p, s)],
      s,
    };
  }
  if (vuelta === 2) {
    const s = (2 * p.porFila - 1) * p.paso;
    const zFrente = p.zFilas[p.filas - 1] + p.paso / 2 + 0.38;
    const xDerecha = p.x1 + 0.75;
    return {
      ruta: [puerta, { x: 0.8, z: zFrente }, { x: xDerecha, z: zFrente }, { x: xDerecha, z: z1 }, puntoRecorrido(p, s)],
      s,
    };
  }
  const s = distanciaEntrada(p);
  return { ruta: [puerta, puntoRecorrido(p, s)], s };
}

/** Donde aparece quien llega: afuera, detrás de la pared izquierda. */
export function puntoAfuera(p: Plano3D): Punto {
  return { x: -1.0, z: p.zEntrada };
}

export function largo(desde: Punto, ruta: Punto[]): number {
  let total = 0;
  let a = desde;
  for (const b of ruta) {
    total += Math.hypot(b.x - a.x, b.z - a.z);
    a = b;
  }
  return total;
}
