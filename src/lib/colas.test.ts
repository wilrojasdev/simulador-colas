import { describe, expect, it } from 'vitest';
import { calcular, distribucionN, type ModeloId, type Parametros, type ResultadoOk } from './colas';

function ok(modelo: ModeloId, p: Partial<Parametros>): ResultadoOk {
  const res = calcular(modelo, { lambda: 1, mu: 1, s: 1, sigma: 0, ...p });
  if (res.tipo !== 'ok') throw new Error(`se esperaba un resultado estable y salió ${res.tipo}`);
  return res;
}

describe('M/M/1', () => {
  it('cajero: λ = 8, μ = 10', () => {
    const r = ok('mm1', { lambda: 8, mu: 10 });
    expect(r.rho).toBeCloseTo(0.8);
    expect(r.P0).toBeCloseTo(0.2);
    expect(r.L).toBeCloseTo(4);
    expect(r.Lq).toBeCloseTo(3.2);
    expect(r.W).toBeCloseTo(0.5);
    expect(r.Wq).toBeCloseTo(0.4);
  });

  it('P(n) = (1 − ρ)ρⁿ y suma casi 1', () => {
    const pn = distribucionN('mm1', { lambda: 8, mu: 10, s: 1, sigma: 0 })!;
    pn.forEach((p, n) => expect(p).toBeCloseTo(0.2 * 0.8 ** n, 10));
    expect(pn.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(0.99);
  });
});

describe('M/D/1', () => {
  it('la fila es la mitad que en M/M/1', () => {
    const r = ok('md1', { lambda: 8, mu: 10 });
    expect(r.Lq).toBeCloseTo(1.6);
    expect(r.Wq).toBeCloseTo(0.2);
    expect(r.W).toBeCloseTo(0.3);
    expect(r.L).toBeCloseTo(2.4);
  });
});

describe('M/G/1', () => {
  it('con σ = 0 coincide con M/D/1', () => {
    const g = ok('mg1', { lambda: 8, mu: 10, sigma: 0 });
    const d = ok('md1', { lambda: 8, mu: 10 });
    expect(g.Lq).toBeCloseTo(d.Lq);
    expect(g.W).toBeCloseTo(d.W);
  });

  it('con σ = 1/μ coincide con M/M/1', () => {
    const g = ok('mg1', { lambda: 8, mu: 10, sigma: 0.1 });
    const m = ok('mm1', { lambda: 8, mu: 10 });
    expect(g.Lq).toBeCloseTo(m.Lq);
    expect(g.L).toBeCloseTo(m.L);
  });

  it('taller: λ = 3, μ = 4, σ = 1/6', () => {
    const r = ok('mg1', { lambda: 3, mu: 4, sigma: 1 / 6 });
    // Lq = (9·(1/36) + 0,5625) / (2·0,25) = 1,625
    expect(r.Lq).toBeCloseTo(1.625);
    expect(r.Wq).toBeCloseTo(1.625 / 3);
  });
});

describe('M/M/s', () => {
  it('λ = 10, μ = 4, s = 3 (ejemplo clásico)', () => {
    const r = ok('mms', { lambda: 10, mu: 4, s: 3 });
    expect(r.rho).toBeCloseTo(0.8333, 4);
    expect(r.P0).toBeCloseTo(0.044944, 5);
    expect(r.Pw).toBeCloseTo(0.702247, 5);
    expect(r.Lq).toBeCloseTo(3.511236, 5);
    expect(r.Wq).toBeCloseTo(0.3511236, 5);
    expect(r.L).toBeCloseTo(6.011236, 5);
  });

  it('con s = 1 coincide con M/M/1', () => {
    const a = ok('mms', { lambda: 8, mu: 10, s: 1 });
    const b = ok('mm1', { lambda: 8, mu: 10 });
    expect(a.Lq).toBeCloseTo(b.Lq);
    expect(a.P0).toBeCloseTo(b.P0);
  });

  it('no se desborda con muchos servidores', () => {
    const r = ok('mms', { lambda: 190, mu: 1, s: 200 });
    expect(Number.isFinite(r.Lq)).toBe(true);
    expect(r.P0).toBeGreaterThan(0);
  });

  it('la distribución de n suma casi 1', () => {
    const pn = distribucionN('mms', { lambda: 10, mu: 4, s: 3, sigma: 0 })!;
    expect(pn[0]).toBeCloseTo(0.044944, 5);
    expect(pn.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(0.99);
  });
});

describe('Ley de Little en todos los modelos', () => {
  const casos: [ModeloId, Partial<Parametros>][] = [
    ['mm1', { lambda: 3, mu: 7 }],
    ['md1', { lambda: 3, mu: 7 }],
    ['mg1', { lambda: 3, mu: 7, sigma: 0.2 }],
    ['mms', { lambda: 12, mu: 5, s: 4 }],
  ];
  it.each(casos)('%s: L = λW y Lq = λWq', (modelo, p) => {
    const r = ok(modelo, p);
    expect(r.L).toBeCloseTo(p.lambda! * r.W);
    expect(r.Lq).toBeCloseTo(p.lambda! * r.Wq);
    expect(r.L).toBeCloseTo(r.Lq + r.r);
  });
});

describe('Validación', () => {
  it('ρ ≥ 1 es inestable', () => {
    expect(calcular('mm1', { lambda: 10, mu: 10, s: 1, sigma: 0 }).tipo).toBe('inestable');
    expect(calcular('mms', { lambda: 10, mu: 4, s: 2, sigma: 0 }).tipo).toBe('inestable');
  });

  it('valores no positivos son inválidos', () => {
    expect(calcular('mm1', { lambda: 0, mu: 10, s: 1, sigma: 0 }).tipo).toBe('invalido');
    expect(calcular('mm1', { lambda: 2, mu: -1, s: 1, sigma: 0 }).tipo).toBe('invalido');
    expect(calcular('mg1', { lambda: 2, mu: 5, s: 1, sigma: -1 }).tipo).toBe('invalido');
    expect(calcular('mms', { lambda: 2, mu: 5, s: 0, sigma: 0 }).tipo).toBe('invalido');
  });
});
