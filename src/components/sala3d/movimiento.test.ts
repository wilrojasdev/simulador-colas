import { describe, expect, it } from 'vitest';
import { Simulacion, type ConfigSim } from '../../lib/simulacion';
import { clave, crearControl, mover, replanificar, sincronizar, vaAlMostrador, type Agente, type Control } from './movimiento';
import { hacerPlano3D, type Plano3D } from './plano';

const DT = 1 / 60;

/** Avanza una persona sola, cuadro a cuadro, hasta que se cumpla `listo` (o se acabe el tiempo). */
function hasta(c: Control, plano: Plano3D, listo: () => boolean, maxSeg = 30) {
  let t = 0;
  while (!listo() && t < maxSeg) {
    mover(c, plano, DT, 1);
    t += DT;
  }
  return t;
}

describe('Una persona sola', () => {
  const plano = hacerPlano3D(1);

  it('entra, llega a su lugar en la fila, la llaman, va al mostrador y sale', () => {
    const a: Agente = { id: 1, numero: 1, estado: 'fila', puesto: 0, mostrador: -1, semilla: 7 };
    const c = crearControl(a, plano, 1);

    const tFila = hasta(c, plano, () => c.modo === 'fila' && Math.abs(c.s - c.sObjetivo) < 1e-6);
    expect(tFila).toBeLessThan(10);
    expect(c.s).toBeCloseTo(0);

    a.estado = 'atendido';
    a.mostrador = 0;
    replanificar(c, a, plano, 1);
    const tMostrador = hasta(c, plano, () => c.modo === 'quieto');
    expect(c.modo).toBe('quieto');
    expect(tMostrador).toBeLessThan(6);
    expect(c.x).toBeCloseTo(plano.mostradores[0]);
    expect(c.z).toBeCloseTo(plano.zCliente);

    a.estado = 'saliendo';
    replanificar(c, a, plano, 1);
    let salio = false;
    hasta(c, plano, () => {
      salio ||= c.modo === 'fuera';
      return salio;
    });
    expect(c.modo).toBe('fuera');
    expect(c.z).toBeLessThan(0);
  });

  it('si la llaman mientras todavía entra, va directo al mostrador', () => {
    const a: Agente = { id: 2, numero: 2, estado: 'fila', puesto: 0, mostrador: -1, semilla: 3 };
    const c = crearControl(a, plano, 1);
    for (let i = 0; i < 20; i++) mover(c, plano, DT, 1);
    a.estado = 'atendido';
    a.mostrador = 0;
    replanificar(c, a, plano, 1);
    const t = hasta(c, plano, () => c.modo === 'quieto');
    expect(c.modo).toBe('quieto');
    expect(t).toBeLessThan(6);
  });

  it('desde el último lugar de la fila llega a la cabeza', () => {
    const ultimo = plano.capacidad - 1;
    const a: Agente = { id: 3, numero: 3, estado: 'fila', puesto: ultimo, mostrador: -1, semilla: 1 };
    const c = crearControl(a, plano, 1);
    hasta(c, plano, () => c.modo === 'fila' && Math.abs(c.s - c.sObjetivo) < 1e-6);
    a.puesto = 0;
    replanificar(c, a, plano, 1);
    const t = hasta(c, plano, () => Math.abs(c.s) < 1e-6);
    expect(c.s).toBeCloseTo(0);
    expect(t).toBeLessThan(10);
  });
});

/**
 * La sala completa sin dibujo: el mismo bucle que hace el navegador. El reloj de la simulación
 * espera mientras alguien camina a un mostrador, así que nadie debe terminar su atención antes de
 * llegar, y el reloj nunca debe quedar trabado.
 */
function salaSinDibujo(conf: ConfigSim, velocidad: number, segundosReales: number) {
  const sim = new Simulacion(conf);
  const plano = hacerPlano3D(conf.servidores);
  const registro = new Map<number, Agente>();
  const controles = new Map<number, Control>();
  const caminando = new Set<number>();
  const llamadoEn = new Map<number, number>();
  const factor = Math.pow(velocidad, 0.45);
  const escala = (0.55 / conf.lambda) * velocidad;

  let ahora = 0;
  let salieron = 0;
  let sinLlegar = 0;
  let peorCamino = 0;
  let peorSalida = 0;
  const saliendoDesde = new Map<number, number>();
  let quietoDesde = 0;
  let peorEspera = 0;

  for (let f = 0; f < segundosReales / DT; f++) {
    ahora += DT;
    if (caminando.size === 0) {
      sim.avanzar(sim.t + DT * escala);
      quietoDesde = ahora;
    }
    peorEspera = Math.max(peorEspera, ahora - quietoDesde);

    for (const a of sincronizar(registro, sim.foto(), plano.capacidad)) {
      let c = controles.get(a.id);
      if (!c) {
        c = crearControl(a, plano, factor);
        controles.set(a.id, c);
        if (a.estado === 'atendido') llamadoEn.set(a.id, ahora);
      }
      const k = clave(a);
      if (k !== c.clave) {
        if (a.estado === 'atendido' && !llamadoEn.has(a.id)) llamadoEn.set(a.id, ahora);
        if (a.estado === 'saliendo') {
          if (c.modo !== 'quieto') sinLlegar++;
          saliendoDesde.set(a.id, ahora);
        }
        c.clave = k;
        replanificar(c, a, plano, factor);
      }
      const { salio } = mover(c, plano, DT, factor);
      if (c.llamado >= 0) c.llamado += DT;
      if (c.modo === 'quieto' && llamadoEn.has(a.id)) {
        peorCamino = Math.max(peorCamino, ahora - llamadoEn.get(a.id)!);
        llamadoEn.delete(a.id);
      }
      if (vaAlMostrador(c, a)) caminando.add(a.id);
      else caminando.delete(a.id);
      if (salio) {
        salieron++;
        peorSalida = Math.max(peorSalida, ahora - saliendoDesde.get(a.id)!);
        registro.delete(a.id);
        controles.delete(a.id);
        caminando.delete(a.id);
      }
    }
  }
  return { salieron, sinLlegar, peorCamino, peorSalida, peorEspera, atendidos: sim.foto().atendidos, enSala: registro.size };
}

describe('La sala completa con la simulación', () => {
  const casos: [string, ConfigSim, number][] = [
    ['M/M/1 ρ=0,8 a 1×', { lambda: 4, mu: 5, servidores: 1, dist: 'exp', sigma: 0 }, 1],
    ['M/M/1 ρ=0,9 a 4×', { lambda: 9, mu: 10, servidores: 1, dist: 'exp', sigma: 0 }, 4],
    ['M/D/1 a 2×', { lambda: 5, mu: 6, servidores: 1, dist: 'det', sigma: 0 }, 2],
    ['M/M/3 a 1×', { lambda: 20, mu: 8, servidores: 3, dist: 'exp', sigma: 0 }, 1],
    ['M/M/10 a 2×', { lambda: 60, mu: 7, servidores: 10, dist: 'exp', sigma: 0 }, 2],
    ['M/G/1 a 1×', { lambda: 3, mu: 4, servidores: 1, dist: 'gen', sigma: 0.1 }, 1],
  ];

  it.each(casos)('%s: todos llegan al mostrador, salen y el reloj no se traba', (_, conf, vel) => {
    const r = salaSinDibujo(conf, vel, 240);
    expect(r.salieron).toBeGreaterThan(20);
    expect(r.sinLlegar).toBe(0);
    expect(r.peorCamino).toBeLessThan(6);
    expect(r.peorSalida).toBeLessThan(8);
    expect(r.peorEspera).toBeLessThan(6);
    expect(r.enSala).toBeLessThanOrEqual(30);
  });
});
