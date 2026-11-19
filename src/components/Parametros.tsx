import { motion } from 'motion/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { ModeloId, Parametros as P, Resultado } from '../lib/colas';
import { duracionLegible, num, pct, UNIDADES, type Unidad } from '../lib/formato';
import { MODELOS } from '../modelos';
import { Segmentado } from './Basicos';
import type { Dato } from './GuiaDatos';

interface Props {
  modelo: ModeloId;
  params: P;
  onCambio: (p: Partial<P>) => void;
  unidad: Unidad;
  onUnidad: (u: Unidad) => void;
  resultado: Resultado;
  onEjemplo: () => void;
  /** avisa qué dato se está señalando o editando, para iluminarlo en la guía */
  onFoco?: (d: Dato | null) => void;
}

export function Parametros({ modelo, params, onCambio, unidad, onUnidad, resultado, onEjemplo, onFoco }: Props) {
  const enfocar = (d: Dato) => (si: boolean) => onFoco?.(si ? d : null);
  const u = UNIDADES[unidad];
  const info = MODELOS[modelo];
  const tServicio = 1 / params.mu;
  const minutosServicio = unidad === 'h' ? tServicio * 60 : tServicio;
  const cadaServidor = modelo === 'mms' ? 'cada servidor' : 'el servidor';

  return (
    <div className="panel flex flex-col gap-6 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-cond text-2xl font-bold">Tus datos</h2>
        <Segmentado
          id="unidad"
          etiqueta="Unidad de tiempo"
          valor={unidad}
          onCambio={onUnidad}
          opciones={[
            { valor: 'h', texto: 'por hora' },
            { valor: 'min', texto: 'por minuto' },
          ]}
        />
      </div>

      <Campo
        simbolo="λ"
        alEnfocar={enfocar('lambda')}
        titulo="Llegadas"
        ayuda={`¿Cuántos clientes llegan, en promedio, por ${u.nombre}?`}
        valor={params.lambda}
        min={0.1}
        max={50}
        paso={0.1}
        onCambio={(v) => onCambio({ lambda: v })}
      />

      <Campo
        simbolo="μ"
        alEnfocar={enfocar('mu')}
        titulo="Atención"
        ayuda={`¿Cuántos clientes atiende ${cadaServidor} por ${u.nombre}?`}
        valor={params.mu}
        min={0.1}
        max={50}
        paso={0.1}
        onCambio={(v) => onCambio({ mu: v })}
        nota={
          params.mu > 0 && (
            <>
              Cada atención dura en promedio{' '}
              <b className="font-semibold text-tinta">
                {num(tServicio)} {u.corta}
              </b>{' '}
              ({duracionLegible(minutosServicio)}).
            </>
          )
        }
      />

      {modelo === 'mms' && (
        <Campo
          simbolo="s"
        alEnfocar={enfocar('s')}
          titulo="Servidores"
          ayuda="¿Cuántos servidores atienden en paralelo?"
          valor={params.s}
          min={1}
          max={10}
          paso={1}
          maxEscrito={20}
          entero
          onCambio={(v) => onCambio({ s: v })}
        />
      )}

      {modelo === 'mg1' && (
        <Campo
          simbolo="σ"
        alEnfocar={enfocar('sigma')}
          titulo="Variación de la atención"
          ayuda={`Desviación estándar de la duración, en ${u.plural}.`}
          valor={params.sigma}
          min={0}
          max={Math.max(0.01, 2.5 * tServicio)}
          paso={Math.max(0.0001, tServicio / 100)}
          onCambio={(v) => onCambio({ sigma: v })}
          nota={
            <span className="flex flex-wrap gap-2">
              <Atajo onClick={() => onCambio({ sigma: 0 })}>σ = 0, como M/D/1</Atajo>
              <Atajo onClick={() => onCambio({ sigma: tServicio })}>σ = 1/μ, como M/M/1</Atajo>
            </span>
          }
        />
      )}

      <Carga resultado={resultado} />

      <div className="border-t border-dashed border-tinta/25 pt-5">
        <p className="text-sm">
          <span className="font-semibold">Ejemplo: {info.ejemplo.titulo}.</span>{' '}
          <span className="text-suave">{info.ejemplo.texto}</span>
        </p>
        <button
          onClick={onEjemplo}
          className="tecla mt-3 rounded-lg bg-tinta px-3.5 py-2 text-sm font-semibold text-papel hover:bg-tinta/90"
        >
          Usar estos valores
        </button>
      </div>
    </div>
  );
}

function Atajo({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="tecla pulsable rounded-md border border-linea bg-pared px-2 py-0.5 text-xs font-semibold text-suave hover:border-tinta hover:text-tinta"
    >
      {children}
    </button>
  );
}

function aTexto(v: number): string {
  return String(Number(v.toFixed(4))).replace('.', ',');
}

function Campo({
  simbolo,
  titulo,
  ayuda,
  valor,
  min,
  max,
  paso,
  maxEscrito = 10000,
  entero = false,
  onCambio,
  nota,
  alEnfocar,
}: {
  simbolo: string;
  titulo: string;
  ayuda: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  maxEscrito?: number;
  entero?: boolean;
  onCambio: (v: number) => void;
  nota?: ReactNode;
  alEnfocar?: (si: boolean) => void;
}) {
  const [texto, setTexto] = useState(aTexto(valor));
  const [editando, setEditando] = useState(false);
  useEffect(() => {
    if (!editando) setTexto(aTexto(valor));
  }, [valor, editando]);

  const escribir = (t: string) => {
    setTexto(t);
    const n = Number(t.replace(',', '.'));
    if (t.trim() !== '' && Number.isFinite(n)) onCambio(Math.min(maxEscrito, entero ? Math.round(n) : n));
  };

  const p = Math.min(100, Math.max(0, ((valor - min) / (max - min)) * 100));

  return (
    <div
      onPointerEnter={(e) => e.pointerType === 'mouse' && alEnfocar?.(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && alEnfocar?.(false)}
      onFocus={() => alEnfocar?.(true)}
      onBlur={() => alEnfocar?.(false)}
    >
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="w-6 text-3xl font-medium italic leading-none">{simbolo}</span>
          <span className="font-semibold">{titulo}</span>
        </div>
        <input
          type="text"
          inputMode="decimal"
          aria-label={`${titulo} (${simbolo})`}
          value={texto}
          onFocus={() => setEditando(true)}
          onBlur={() => setEditando(false)}
          onChange={(e) => escribir(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
          className="w-24 rounded-lg campo border border-linea px-2 py-1 text-right font-cond text-2xl font-semibold outline-none transition-colors focus:border-tinta"
        />
      </div>
      <p className="mb-3 mt-1 text-sm text-suave">{ayuda}</p>
      <input
        type="range"
        className="deslizador"
        aria-label={`${titulo}, deslizador`}
        min={min}
        max={max}
        step={paso}
        value={Math.min(max, Math.max(min, valor))}
        onChange={(e) => onCambio(entero ? Math.round(Number(e.target.value)) : Number(e.target.value))}
        style={{ '--p': `${p}%` } as CSSProperties}
      />
      {nota && <div className="mt-2 text-sm text-suave">{nota}</div>}
    </div>
  );
}

/** Qué tan ocupado está el sistema: tinta si va bien, amarillo si está al límite, rojo si se desborda. */
function Carga({ resultado }: { resultado: Resultado }) {
  if (resultado.tipo === 'invalido') return null;
  const rho = resultado.rho;
  const nivel = rho >= 1 ? 'inestable' : rho >= 0.85 ? 'cargado' : 'bien';
  const color = { bien: 'var(--color-tinta)', cargado: 'var(--color-senal)', inestable: 'var(--color-alerta)' }[nivel];
  const texto = {
    bien: 'Estable: los servidores dan abasto.',
    cargado: 'Estable, pero al límite: la fila crece rápido.',
    inestable: 'Inestable: llegan más clientes de los que se pueden atender.',
  }[nivel];
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="font-semibold">
          Ocupación <i className="font-medium">ρ</i>
        </span>
        <span className="font-cond text-2xl font-semibold" style={{ color: nivel === 'cargado' ? undefined : color }}>
          {pct(rho)}
        </span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-tinta/10">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${Math.min(1, rho) * 100}%`, backgroundColor: color }}
          transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        />
        {/* Marca del 85 %, donde la fila empieza a dispararse */}
        <span className="absolute -top-1 h-4 w-px bg-tinta/40" style={{ left: '85%' }} aria-hidden />
      </div>
      <p className="mt-2 text-sm text-suave">{texto}</p>
    </div>
  );
}
