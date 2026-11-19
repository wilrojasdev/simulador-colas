import type { ModeloId, Parametros } from './lib/colas';
import type { Unidad } from './lib/formato';
import type { Distribucion } from './lib/simulacion';

export interface InfoModelo {
  id: ModeloId;
  nombre: string;
  titulo: string;
  /** en una línea, cómo funciona */
  resumen: string;
  letras: [string, string, string];
  dist: Distribucion;
  ejemplo: { titulo: string; texto: string; params: Partial<Parametros>; unidad: Unidad };
}

export const MODELOS: Record<ModeloId, InfoModelo> = {
  mm1: {
    id: 'mm1',
    nombre: 'M/M/1',
    titulo: 'Un servidor',
    resumen: 'Llegan al azar y un solo servidor atiende; cada atención dura distinto.',
    letras: ['M', 'M', '1'],
    dist: 'exp',
    ejemplo: {
      titulo: 'cajero de banco',
      texto: 'Llegan en promedio 8 clientes por hora y el cajero atiende 10 por hora.',
      params: { lambda: 8, mu: 10 },
      unidad: 'h',
    },
  },
  md1: {
    id: 'md1',
    nombre: 'M/D/1',
    titulo: 'Servicio fijo',
    resumen: 'Llegan al azar, pero cada atención dura exactamente lo mismo.',
    letras: ['M', 'D', '1'],
    dist: 'det',
    ejemplo: {
      titulo: 'lavadero automático',
      texto: 'Llegan 5 carros por hora y cada lavado dura exactamente 10 minutos (μ = 6 por hora).',
      params: { lambda: 5, mu: 6 },
      unidad: 'h',
    },
  },
  mms: {
    id: 'mms',
    nombre: 'M/M/s',
    titulo: 'Varios servidores',
    resumen: 'Una sola fila y varios servidores que atienden en paralelo.',
    letras: ['M', 'M', 's'],
    dist: 'exp',
    ejemplo: {
      titulo: 'call center',
      texto: 'Entran 20 llamadas por hora, cada asesor atiende 8 por hora y hay 3 asesores.',
      params: { lambda: 20, mu: 8, s: 3 },
      unidad: 'h',
    },
  },
  mg1: {
    id: 'mg1',
    nombre: 'M/G/1',
    titulo: 'Servicio general',
    resumen: 'Un servidor con atenciones de cualquier duración: unas cortas, otras larguísimas.',
    letras: ['M', 'G', '1'],
    dist: 'gen',
    ejemplo: {
      titulo: 'taller mecánico',
      texto:
        'Llegan 3 carros por hora; la revisión dura en promedio 15 minutos (μ = 4 por hora) con una desviación de 10 minutos (σ = 1/6 h).',
      params: { lambda: 3, mu: 4, sigma: 1 / 6 },
      unidad: 'h',
    },
  },
};

export const ORDEN: ModeloId[] = ['mm1', 'md1', 'mms', 'mg1'];

/** Qué significa cada letra de la notación de Kendall, según su posición. */
export const KENDALL: { etiqueta: string; letras: Record<string, string> }[] = [
  {
    etiqueta: 'Llegadas',
    letras: { M: 'Aleatorias: siguen un proceso de Poisson.' },
  },
  {
    etiqueta: 'Atención',
    letras: {
      M: 'Dura un tiempo aleatorio, con distribución exponencial.',
      D: 'Dura siempre exactamente lo mismo.',
      G: 'Cualquier distribución: basta su media y su desviación.',
    },
  },
  {
    etiqueta: 'Servidores',
    letras: { '1': 'Uno solo atiende a todos.', s: 'Varios en paralelo, con una sola fila.' },
  },
];
