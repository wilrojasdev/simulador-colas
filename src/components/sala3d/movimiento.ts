/**
 * Cómo se desplaza cada persona por la sala, sin nada de dibujo: entra, hace la fila, va al
 * mostrador y sale. Persona3D llama a `mover` en cada cuadro; las pruebas lo llaman en un bucle.
 */
import type { Foto } from '../../lib/simulacion';
import {
  caminoAlMostrador,
  caminoDirecto,
  caminoSalida,
  distanciaEntrada,
  distanciaPuesto,
  entradaPara,
  largo,
  puntoAfuera,
  puntoRecorrido,
  type Plano3D,
  type Punto,
} from './plano';

export interface Agente {
  id: number;
  numero: number;
  estado: 'fila' | 'atendido' | 'saliendo';
  /** lugar en la fila (0 = el primero) */
  puesto: number;
  mostrador: number;
  semilla: number;
}

export type Modo = 'camino' | 'fila' | 'quieto' | 'fuera';

export interface Control {
  modo: Modo;
  x: number;
  z: number;
  ruta: Punto[];
  despues: 'fila' | 'quieto' | 'fuera';
  /** distancia a la cabeza de la fila, a lo largo del zigzag */
  s: number;
  sObjetivo: number;
  /** al llegar a la cabeza, caminar a este mostrador (-1: ninguno) */
  mostradorTras: number;
  tope: number;
  v: number;
  yaw: number;
  fase: number;
  marcha: number;
  quietoDesde: number;
  pose: number;
  clave: string;
  salida: number;
  llamado: number;
  t: number;
}

const ACELERACION = 5;
const FRENADO = 4;

/** Qué tan rápido camina según cuánto le falta: si el trayecto es largo, trota. */
export function topePara(distancia: number, factor: number) {
  return Math.min(4.6, Math.max(1.5, distancia / 2)) * factor;
}

export const clave = (a: Agente) => `${a.estado}|${a.puesto}|${a.mostrador}`;

export function crearControl(a: Agente, p: Plano3D, factor: number): Control {
  const afuera = puntoAfuera(p);
  const c: Control = {
    modo: 'camino',
    x: afuera.x,
    z: afuera.z,
    ruta: [],
    despues: 'fila',
    s: distanciaEntrada(p),
    sObjetivo: distanciaPuesto(p, a.puesto),
    mostradorTras: -1,
    tope: 1.5,
    v: 0,
    yaw: Math.PI / 2,
    fase: 0,
    marcha: 0,
    quietoDesde: 0,
    pose: 0,
    clave: '',
    salida: -1,
    llamado: -1,
    t: 0,
  };
  if (a.estado === 'atendido') {
    c.ruta = caminoDirecto(p, a.mostrador);
    c.despues = 'quieto';
    c.llamado = 0;
  } else {
    const entrada = entradaPara(p, a.puesto);
    c.ruta = entrada.ruta;
    c.s = entrada.s;
  }
  c.tope = topePara(largo(c, c.ruta) + (a.estado === 'fila' ? Math.abs(c.s - c.sObjetivo) : 0), factor);
  c.clave = clave(a);
  return c;
}

/** Ajusta el plan cuando la simulación le da una orden nueva (avanzar en la fila, ir a un mostrador, salir). */
export function replanificar(c: Control, a: Agente, p: Plano3D, factor: number) {
  if (a.estado === 'fila') {
    c.sObjetivo = distanciaPuesto(p, a.puesto);
    if (c.modo === 'fila') c.tope = topePara(Math.abs(c.s - c.sObjetivo), factor);
  } else if (a.estado === 'atendido') {
    c.llamado = 0;
    if (c.modo === 'fila') {
      c.sObjetivo = 0;
      c.mostradorTras = a.mostrador;
      c.tope = topePara(c.s + 3, factor);
    } else if (c.modo === 'camino' && c.despues === 'fila') {
      // La llamaron antes de llegar a la fila: va directo por el pasillo lateral.
      c.ruta = caminoDirecto(p, a.mostrador);
      c.despues = 'quieto';
      c.tope = topePara(largo(c, c.ruta), factor);
    }
  } else if (c.modo !== 'fuera') {
    c.ruta = caminoSalida(p, c);
    c.modo = 'camino';
    c.despues = 'fuera';
    c.salida = 0;
    c.tope = topePara(largo(c, c.ruta), factor);
  }
}

/**
 * Avanza a la persona `dt` segundos. Devuelve hacia dónde se movió (para orientarla) y si en este
 * paso terminó de salir de la sala.
 */
export function mover(c: Control, plano: Plano3D, dt: number, factor: number): { dirX: number; dirZ: number; salio: boolean } {
  let dirX = 0;
  let dirZ = 0;
  let salio = false;
  let restante = 0;
  if (c.modo === 'camino') restante = largo(c, c.ruta);
  else if (c.modo === 'fila') restante = Math.abs(c.s - c.sObjetivo) + (c.mostradorTras >= 0 ? 3 : 0);
  // Frena justo a tiempo para llegar, pero nunca baja de 0,25 m/s mientras le falte algo.
  const objetivoV = restante > 1e-6 ? Math.min(c.tope, Math.sqrt(2 * FRENADO * restante) + 0.25) : 0;
  c.v = objetivoV > c.v ? Math.min(objetivoV, c.v + ACELERACION * dt) : objetivoV;
  let avance = c.v * dt;

  if (c.modo === 'camino') {
    while (avance > 0 && c.ruta.length) {
      const o = c.ruta[0];
      const dx = o.x - c.x;
      const dz = o.z - c.z;
      const d = Math.hypot(dx, dz);
      if (d > 1e-6) {
        dirX = dx;
        dirZ = dz;
      }
      if (d <= avance) {
        c.x = o.x;
        c.z = o.z;
        avance -= d;
        c.ruta.shift();
      } else {
        c.x += (dx / d) * avance;
        c.z += (dz / d) * avance;
        avance = 0;
      }
    }
    if (!c.ruta.length) {
      if (c.despues === 'fila') {
        c.modo = 'fila';
        c.tope = topePara(Math.abs(c.s - c.sObjetivo), factor);
      } else if (c.despues === 'quieto') {
        c.modo = 'quieto';
      } else {
        c.modo = 'fuera';
        salio = true;
      }
    }
  } else if (c.modo === 'fila') {
    const d = c.s - c.sObjetivo;
    if (Math.abs(d) > 1e-6) {
      const antes = puntoRecorrido(plano, c.s);
      c.s -= Math.sign(d) * Math.min(Math.abs(d), avance);
      const ahora = puntoRecorrido(plano, c.s);
      dirX = ahora.x - antes.x;
      dirZ = ahora.z - antes.z;
      c.x = ahora.x;
      c.z = ahora.z;
    } else if (c.mostradorTras >= 0) {
      c.modo = 'camino';
      c.ruta = caminoAlMostrador(plano, c.mostradorTras);
      c.despues = 'quieto';
      c.mostradorTras = -1;
      c.tope = topePara(largo(c, c.ruta), factor);
    }
  }
  return { dirX, dirZ, salio };
}

/** Si va hacia un mostrador; mientras alguien vaya, el reloj de la simulación la espera (con un tope por si algo se traba). */
export function vaAlMostrador(c: Control, a: Agente): boolean {
  return a.estado === 'atendido' && c.modo !== 'quieto' && c.llamado < 6;
}

function hash(n: number) {
  let h = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/** Número fijo por persona para variar su ropa y sus gestos. */
export function semillaDe(id: number) {
  return hash(id);
}

/** Pasa la foto de la simulación al registro de personas en la sala, conservando a quienes van saliendo. */
export function sincronizar(registro: Map<number, Agente>, foto: Foto, capacidad: number): Agente[] {
  const vistos = new Set<number>();
  foto.cola.slice(0, capacidad).forEach((c, i) => {
    vistos.add(c.id);
    const a = registro.get(c.id);
    if (a) {
      a.estado = 'fila';
      a.puesto = i;
    } else {
      registro.set(c.id, { id: c.id, numero: c.numero, estado: 'fila', puesto: i, mostrador: -1, semilla: semillaDe(c.id) });
    }
  });
  foto.servidores.forEach((c, k) => {
    if (!c) return;
    vistos.add(c.id);
    const a = registro.get(c.id);
    if (a) {
      a.estado = 'atendido';
      a.mostrador = k;
    } else {
      registro.set(c.id, { id: c.id, numero: c.numero, estado: 'atendido', puesto: -1, mostrador: k, semilla: semillaDe(c.id) });
    }
  });
  for (const a of registro.values()) {
    if (vistos.has(a.id)) continue;
    if (a.estado === 'atendido') a.estado = 'saliendo';
    else if (a.estado === 'fila') registro.delete(a.id); // la simulación se reinició
  }
  return [...registro.values()];
}
