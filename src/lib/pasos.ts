// El cálculo de cada modelo contado paso a paso, con las fórmulas en LaTeX y tus números.
import { terminosMMs, type ModeloId, type Parametros, type ResultadoOk } from './colas';
import { tex as t, UNIDADES, type Unidad } from './formato';

export interface Paso {
  titulo: string;
  explicacion: string;
  formula: string;
}

export function pasos(modelo: ModeloId, p: Parametros, r: ResultadoOk, unidad: Unidad): Paso[] {
  const u = `\\ \\text{${UNIDADES[unidad].corta}}`;
  const lista: Paso[] = [];
  const l = t(p.lambda);
  const m = t(p.mu);

  if (modelo === 'mms') {
    const s = r.servidores;
    const e = terminosMMs(r.r, s);
    lista.push(
      {
        titulo: 'Carga ofrecida',
        explicacion: 'Cuántos servidores estarían ocupados, en promedio, para atender a todos los que llegan.',
        formula: `r = \\dfrac{\\lambda}{\\mu} = \\dfrac{${l}}{${m}} = ${t(r.r)}`,
      },
      {
        titulo: 'Utilización de cada servidor',
        explicacion: 'Fracción del tiempo que cada servidor está ocupado. Tiene que ser menor que 1.',
        formula: `\\rho = \\dfrac{\\lambda}{s\\,\\mu} = \\dfrac{${l}}{${s} \\cdot ${m}} = ${t(r.rho)}`,
      },
      {
        titulo: 'Probabilidad de que no haya nadie',
        explicacion: 'Suma de los casos con menos de s clientes más el caso en que todos los servidores están ocupados.',
        formula: `P_0 = \\left[\\sum_{n=0}^{s-1} \\dfrac{r^n}{n!} + \\dfrac{r^s}{s!\\,(1-\\rho)}\\right]^{-1} = \\left[${t(e.suma)} + ${t(e.ultimo)}\\right]^{-1} = ${t(r.P0)}`,
      },
      {
        titulo: 'Probabilidad de tener que esperar (Erlang C)',
        explicacion: 'Probabilidad de que un cliente llegue y encuentre a todos los servidores ocupados.',
        formula: `P_w = \\dfrac{r^s}{s!\\,(1-\\rho)}\\,P_0 = ${t(e.ultimo)} \\cdot ${t(r.P0)} = ${t(r.Pw)}`,
      },
      {
        titulo: 'Clientes esperando en la fila',
        explicacion: 'Número promedio de clientes que están haciendo fila.',
        formula: `L_q = P_w \\, \\dfrac{\\rho}{1-\\rho} = ${t(r.Pw)} \\cdot \\dfrac{${t(r.rho)}}{1 - ${t(r.rho)}} = ${t(r.Lq)}`,
      },
    );
  } else {
    const rho = t(r.rho);
    lista.push(
      {
        titulo: 'Utilización del servidor',
        explicacion: 'Fracción del tiempo que el servidor está ocupado. Tiene que ser menor que 1.',
        formula: `\\rho = \\dfrac{\\lambda}{\\mu} = \\dfrac{${l}}{${m}} = ${rho}`,
      },
      {
        titulo: 'Probabilidad de que no haya nadie',
        explicacion: 'Si el servidor está ocupado una fracción ρ del tiempo, está libre el resto.',
        formula: `P_0 = 1 - \\rho = 1 - ${rho} = ${t(r.P0)}`,
      },
    );
    if (modelo === 'mm1')
      lista.push({
        titulo: 'Clientes esperando en la fila',
        explicacion: 'Fórmula de M/M/1: llegadas y servicio exponenciales.',
        formula: `L_q = \\dfrac{\\rho^2}{1-\\rho} = \\dfrac{(${rho})^2}{1 - ${rho}} = ${t(r.Lq)}`,
      });
    else if (modelo === 'md1')
      lista.push({
        titulo: 'Clientes esperando en la fila',
        explicacion: 'Como el servicio dura siempre lo mismo, la fila es exactamente la mitad que en M/M/1.',
        formula: `L_q = \\dfrac{\\rho^2}{2\\,(1-\\rho)} = \\dfrac{(${rho})^2}{2\\,(1 - ${rho})} = ${t(r.Lq)}`,
      });
    else
      lista.push({
        titulo: 'Clientes esperando en la fila (Pollaczek-Khinchine)',
        explicacion: 'Sirve para cualquier distribución del servicio: solo necesita su media 1/μ y su desviación σ.',
        formula: `L_q = \\dfrac{\\lambda^2\\sigma^2 + \\rho^2}{2\\,(1-\\rho)} = \\dfrac{(${l})^2 (${t(p.sigma)})^2 + (${rho})^2}{2\\,(1 - ${rho})} = ${t(r.Lq)}`,
      });
  }

  lista.push(
    {
      titulo: 'Tiempo esperando en la fila',
      explicacion: 'Ley de Little: si llegan λ clientes por unidad de tiempo y hay Lq en fila, cada uno espera Lq/λ.',
      formula: `W_q = \\dfrac{L_q}{\\lambda} = \\dfrac{${t(r.Lq)}}{${l}} = ${t(r.Wq)}${u}`,
    },
    {
      titulo: 'Tiempo total en el sistema',
      explicacion: 'Lo que espera en la fila más lo que dura su atención (1/μ).',
      formula: `W = W_q + \\dfrac{1}{\\mu} = ${t(r.Wq)} + \\dfrac{1}{${m}} = ${t(r.W)}${u}`,
    },
    {
      titulo: 'Clientes en el sistema',
      explicacion: 'Otra vez la ley de Little, ahora con el tiempo total.',
      formula: `L = \\lambda\\,W = ${l} \\cdot ${t(r.W)} = ${t(r.L)}`,
    },
  );
  return lista;
}
