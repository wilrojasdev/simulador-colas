import { describe, expect, it } from 'vitest';
import { calcular, type ResultadoOk } from './colas';
import { Simulacion, muestraServicio, type ConfigSim } from './simulacion';

function correr(conf: ConfigSim, horas: number) {
  const sim = new Simulacion(conf);
  sim.avanzar(horas * 0.05); // calentamiento: la fila arranca vacía
  sim.reiniciarEstadisticas();
  for (let t = sim.t; t < horas; t += 10) sim.avanzar(t);
  return sim.estadisticas();
}

describe('Simulación contra la teoría (margen amplio: es aleatoria)', () => {
  it('M/M/1 con λ = 8, μ = 10', () => {
    const teo = calcular('mm1', { lambda: 8, mu: 10, s: 1, sigma: 0 }) as ResultadoOk;
    const st = correr({ lambda: 8, mu: 10, servidores: 1, dist: 'exp', sigma: 0 }, 8000);
    expect(st.rho!).toBeCloseTo(teo.rho, 1);
    expect(Math.abs(st.Wq! - teo.Wq) / teo.Wq).toBeLessThan(0.2);
  });

  it('M/D/1 con λ = 5, μ = 6', () => {
    const teo = calcular('md1', { lambda: 5, mu: 6, s: 1, sigma: 0 }) as ResultadoOk;
    const st = correr({ lambda: 5, mu: 6, servidores: 1, dist: 'det', sigma: 0 }, 8000);
    expect(Math.abs(st.Lq! - teo.Lq) / teo.Lq).toBeLessThan(0.2);
  });

  it('M/M/s con λ = 20, μ = 8, s = 3', () => {
    const teo = calcular('mms', { lambda: 20, mu: 8, s: 3, sigma: 0 }) as ResultadoOk;
    const st = correr({ lambda: 20, mu: 8, servidores: 3, dist: 'exp', sigma: 0 }, 4000);
    expect(Math.abs(st.Lq! - teo.Lq) / teo.Lq).toBeLessThan(0.2);
  });
});

describe('Tiempo de servicio general (lognormal)', () => {
  it('tiene la media y la desviación pedidas', () => {
    const n = 200000;
    let suma = 0;
    let suma2 = 0;
    for (let i = 0; i < n; i++) {
      const x = muestraServicio({ mu: 4, dist: 'gen', sigma: 1 / 6 });
      suma += x;
      suma2 += x * x;
    }
    const media = suma / n;
    const desv = Math.sqrt(suma2 / n - media * media);
    expect(media).toBeCloseTo(0.25, 2);
    expect(desv).toBeCloseTo(1 / 6, 2);
  });
});
