// Simulación de eventos discretos de una fila con s servidores.
// La interfaz la avanza poco a poco (con el reloj del navegador) para animarla.

export type Distribucion = 'exp' | 'det' | 'gen';

export interface ConfigSim {
  lambda: number;
  mu: number;
  servidores: number;
  dist: Distribucion;
  sigma: number;
}

export interface Cliente {
  id: number;
  /** número de turno dentro de esta simulación (1, 2, 3…) */
  numero: number;
  llegada: number;
  inicio: number;
  fin: number;
  /** true si tuvo que hacer fila antes de ser atendido */
  hizoFila: boolean;
}

export interface Estadisticas {
  duracion: number;
  atendidos: number;
  Wq: number | null;
  W: number | null;
  Lq: number | null;
  L: number | null;
  rho: number | null;
}

export interface Foto {
  t: number;
  cola: Cliente[];
  enCola: number;
  servidores: (Cliente | null)[];
  atendidos: number;
  ultimaLlegada: number;
  /** último cliente llamado a un servidor, para el tablero de turnos */
  llamado: Llamado | null;
  stats: Estadisticas;
}

export interface Llamado {
  id: number;
  numero: number;
  servidor: number;
}

// Los id no se repiten entre simulaciones, así las animaciones nunca confunden clientes.
let siguienteId = 1;

export function muestraExponencial(tasa: number): number {
  return -Math.log(1 - Math.random()) / tasa;
}

function normalEstandar(): number {
  const u = 1 - Math.random();
  const v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Tiempo de servicio con media 1/μ según la distribución del modelo. */
export function muestraServicio(c: Pick<ConfigSim, 'mu' | 'dist' | 'sigma'>): number {
  const media = 1 / c.mu;
  if (c.dist === 'exp') return muestraExponencial(c.mu);
  if (c.dist === 'det' || c.sigma <= 0) return media;
  // M/G/1: lognormal con la media y la desviación pedidas
  const s2 = Math.log(1 + (c.sigma / media) ** 2);
  return Math.exp(Math.log(media) - s2 / 2 + Math.sqrt(s2) * normalEstandar());
}

export class Simulacion {
  t = 0;
  cola: Cliente[] = [];
  servidores: (Cliente | null)[];
  atendidos = 0;
  ultimaLlegada = 0;
  llamado: Llamado | null = null;

  private conf: ConfigSim;
  private turnos = 0;
  private proximaLlegada: number;

  // Acumuladores para comparar con la teoría
  private t0 = 0;
  private areaCola = 0;
  private areaSistema = 0;
  private areaOcupados = 0;
  private sumaEspera = 0;
  private nEspera = 0;
  private sumaSistema = 0;
  private nSalidas = 0;

  constructor(conf: ConfigSim) {
    this.conf = conf;
    this.servidores = Array.from({ length: conf.servidores }, () => null);
    this.proximaLlegada = muestraExponencial(conf.lambda);
  }

  /** Cambia λ, μ o σ sin vaciar la fila. Las estadísticas empiezan de nuevo. */
  configurar(conf: ConfigSim) {
    const cambiaLlegada = conf.lambda !== this.conf.lambda;
    this.conf = conf;
    // Las llegadas exponenciales no tienen memoria: se puede volver a sortear desde ahora.
    if (cambiaLlegada) this.proximaLlegada = this.t + muestraExponencial(conf.lambda);
    this.reiniciarEstadisticas();
  }

  reiniciarEstadisticas() {
    this.t0 = this.t;
    this.areaCola = this.areaSistema = this.areaOcupados = 0;
    this.sumaEspera = this.nEspera = this.sumaSistema = this.nSalidas = 0;
  }

  private ocupados(): number {
    let n = 0;
    for (const c of this.servidores) if (c) n++;
    return n;
  }

  private acumularHasta(t: number) {
    const dt = t - this.t;
    if (dt > 0) {
      const oc = this.ocupados();
      this.areaCola += this.cola.length * dt;
      this.areaSistema += (this.cola.length + oc) * dt;
      this.areaOcupados += oc * dt;
      this.t = t;
    }
  }

  private iniciarServicio(i: number, c: Cliente) {
    c.inicio = this.t;
    c.fin = this.t + muestraServicio(this.conf);
    this.servidores[i] = c;
    this.llamado = { id: c.id, numero: c.numero, servidor: i };
    this.sumaEspera += c.inicio - c.llegada;
    this.nEspera++;
  }

  /** Procesa todos los eventos hasta el instante `hasta`. Devuelve true si algo cambió. */
  avanzar(hasta: number): boolean {
    let cambio = false;
    for (let guarda = 0; guarda < 20000; guarda++) {
      let siguiente = this.proximaLlegada;
      let servidor = -1;
      this.servidores.forEach((c, i) => {
        if (c && c.fin < siguiente) {
          siguiente = c.fin;
          servidor = i;
        }
      });
      if (siguiente > hasta) break;

      this.acumularHasta(siguiente);
      cambio = true;

      if (servidor === -1) {
        // Llega un cliente
        const c: Cliente = { id: siguienteId++, numero: ++this.turnos, llegada: this.t, inicio: NaN, fin: NaN, hizoFila: false };
        this.ultimaLlegada = c.id;
        const libre = this.servidores.indexOf(null);
        if (libre >= 0) this.iniciarServicio(libre, c);
        else {
          c.hizoFila = true;
          this.cola.push(c);
        }
        this.proximaLlegada = this.t + muestraExponencial(this.conf.lambda);
      } else {
        // Termina un servicio
        const c = this.servidores[servidor]!;
        this.atendidos++;
        this.sumaSistema += this.t - c.llegada;
        this.nSalidas++;
        this.servidores[servidor] = null;
        const siguienteEnFila = this.cola.shift();
        if (siguienteEnFila) this.iniciarServicio(servidor, siguienteEnFila);
      }
    }
    this.acumularHasta(hasta);
    return cambio;
  }

  estadisticas(): Estadisticas {
    const duracion = this.t - this.t0;
    const hay = duracion > 0;
    return {
      duracion,
      atendidos: this.nSalidas,
      Wq: this.nEspera >= 3 ? this.sumaEspera / this.nEspera : null,
      W: this.nSalidas >= 3 ? this.sumaSistema / this.nSalidas : null,
      Lq: hay ? this.areaCola / duracion : null,
      L: hay ? this.areaSistema / duracion : null,
      rho: hay ? this.areaOcupados / (duracion * this.servidores.length) : null,
    };
  }

  /** Copia del estado para pintar (solo los primeros clientes de la fila). */
  foto(limite = 60): Foto {
    return {
      t: this.t,
      cola: this.cola.slice(0, limite).map((c) => ({ ...c })),
      enCola: this.cola.length,
      servidores: this.servidores.map((c) => (c ? { ...c } : null)),
      atendidos: this.atendidos,
      ultimaLlegada: this.ultimaLlegada,
      llamado: this.llamado,
      stats: this.estadisticas(),
    };
  }
}
