import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Object3D, Vector3, type Group, type OrthographicCamera } from 'three';
import type { Foto } from '../../lib/simulacion';
import { PALETAS, useTema, type Paleta3D } from '../../temas';
import { Cintas3D, Habitacion, Mostrador3D } from './Mobiliario';
import { sincronizar, type Agente } from './movimiento';
import { Persona3D, type Opciones } from './Persona3D';
import { hacerPlano3D, vueltaDeEntrada, type Plano3D, type Punto } from './plano';

interface Props {
  foto: Foto;
  reloj: MotionValue<number>;
  velocidad: number;
  pausa: boolean;
  letra: string;
  /** ids de quienes van hacia un mostrador; mientras no esté vacío, el reloj de la simulación espera */
  caminando: Set<number>;
}

export default function Sala3D({ foto, reloj, velocidad, pausa, letra, caminando }: Props) {
  const tema = useTema();
  const paleta = PALETAS[tema];
  const servidores = foto.servidores.length;
  const plano = useMemo(() => hacerPlano3D(servidores), [servidores]);
  // Al cambiar el número de mostradores cambia el plano: la sala empieza vacía.
  const registro = useMemo(() => new Map<number, Agente>(), [servidores]);
  const [, setVersion] = useState(0);
  const agentes = sincronizar(registro, foto, plano.capacidad);
  const afuera = foto.enCola - Math.min(foto.cola.length, plano.capacidad);

  const opciones = useRef<Opciones>({ velocidad, pausa });
  opciones.current = { velocidad, pausa };
  const posiciones = useRef(new Map<number, Punto>());

  if (import.meta.env.DEV) {
    // Para inspeccionar la sala desde la consola mientras se desarrolla.
    (window as unknown as { __sala: unknown }).__sala = { registro, posiciones: posiciones.current, plano };
  }

  const onFuera = useCallback(
    (id: number) => {
      registro.delete(id);
      posiciones.current.delete(id);
      setVersion((v) => v + 1);
    },
    [registro],
  );

  // Los carteles se dibujan en un canvas: hay que esperar a que cargue la tipografía.
  const [fuentes, setFuentes] = useState(false);
  useEffect(() => {
    let vivo = true;
    document.fonts.load('700 60px "Barlow Condensed"').finally(() => vivo && setFuentes(true));
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="relative h-[clamp(300px,50vw,540px)] touch-pan-y select-none">
      <Canvas shadows flat orthographic dpr={[1, 2]} camera={{ position: [10, 10, 10], zoom: 40, near: 0.1, far: 200 }}>
        <color attach="background" args={[paleta.fondo]} />
        <Encuadre plano={plano} />
        <Luces plano={plano} paleta={paleta} />
        <Giro>
          <group position={[-plano.ancho / 2, 0, -plano.fondo / 2]}>
            <Habitacion plano={plano} paleta={paleta} posiciones={posiciones} reloj={reloj} fuentes={fuentes} />
            <Cintas3D plano={plano} paleta={paleta} entrada={vueltaDeEntrada(plano, foto.cola.length)} posiciones={posiciones} />
            {plano.mostradores.map((x, k) => (
              <Mostrador3D
                key={k}
                x={x}
                plano={plano}
                paleta={paleta}
                etiqueta={`${letra}${k + 1}`}
                cliente={foto.servidores[k] ?? null}
                reloj={reloj}
                fuentes={fuentes}
                semilla={k + 1}
              />
            ))}
            {agentes.map((a) => (
              <Persona3D
                key={a.id}
                agente={a}
                plano={plano}
                paleta={paleta}
                opciones={opciones}
                posiciones={posiciones}
                onFuera={onFuera}
                caminando={caminando}
                fuentes={fuentes}
              />
            ))}
          </group>
        </Giro>
      </Canvas>
      {afuera > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-full bg-tinta px-2.5 py-1 font-cond text-sm font-semibold text-papel shadow-lg">
          +{afuera} esperando afuera
        </div>
      )}
      <p className="pointer-events-none absolute bottom-2 right-3 text-xs text-suave/80">Arrastra para girar la sala</p>
    </div>
  );
}

/** Cámara ortográfica en diagonal que encuadra toda la sala, con una entrada suave al aparecer. */
function Encuadre({ plano }: { plano: Plano3D }) {
  const camera = useThree((s) => s.camera) as OrthographicCamera;
  const size = useThree((s) => s.size);
  const zoomFinal = useRef(40);
  const entrada = useRef(0);

  useLayoutEffect(() => {
    const centro = new Vector3(0, 0.7, 0);
    const direccion = new Vector3(0.4, 0.85, 1).normalize();
    camera.position.copy(centro).addScaledVector(direccion, 40);
    camera.up.set(0, 1, 0);
    camera.lookAt(centro);
    camera.updateMatrixWorld();
    const { ancho: a, fondo: f, alturaPared: h } = plano;
    const esquinas: [number, number, number][] = [];
    for (const x of [-a / 2 - 0.2, a / 2]) {
      for (const z of [-f / 2 - 0.2, f / 2]) {
        esquinas.push([x, -0.22, z], [x, z < 0 || x < 0 ? h : 1.9, z]);
      }
    }
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    const v = new Vector3();
    for (const e of esquinas) {
      v.set(...e).applyMatrix4(camera.matrixWorldInverse);
      minX = Math.min(minX, v.x);
      maxX = Math.max(maxX, v.x);
      minY = Math.min(minY, v.y);
      maxY = Math.max(maxY, v.y);
    }
    const derecha = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0);
    const arriba = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1);
    camera.position.addScaledVector(derecha, (minX + maxX) / 2).addScaledVector(arriba, (minY + maxY) / 2);
    zoomFinal.current = Math.min(size.width / ((maxX - minX) * 1.02), size.height / ((maxY - minY) * 1.04));
    camera.zoom = entrada.current >= 1 ? zoomFinal.current : zoomFinal.current * 0.9;
    camera.updateProjectionMatrix();
  }, [camera, size, plano]);

  useFrame((_, dt) => {
    if (entrada.current >= 1) return;
    entrada.current = Math.min(1, entrada.current + dt / 0.9);
    const e = 1 - Math.pow(1 - entrada.current, 3);
    camera.zoom = zoomFinal.current * (0.9 + 0.1 * e);
    camera.updateProjectionMatrix();
  });
  return null;
}

function Luces({ plano, paleta }: { plano: Plano3D; paleta: Paleta3D }) {
  const objetivo = useMemo(() => new Object3D(), []);
  const lado = Math.max(plano.ancho, plano.fondo) / 2 + 1.5;
  return (
    <>
      <hemisphereLight args={[paleta.cielo, paleta.suelo, paleta.luzAmbiente]} />
      <primitive object={objetivo} position={[0, 0, 0]} />
      <directionalLight
        position={[-3.5, 9, 6]}
        intensity={paleta.luzSol}
        color={paleta.colorSol}
        target={objetivo}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-lado}
        shadow-camera-right={lado}
        shadow-camera-top={lado}
        shadow-camera-bottom={-lado}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
    </>
  );
}

/** Arrastrar gira la sala un poco; al soltar vuelve a su lugar como un resorte. Sin arrastrar, respira. */
function Giro({ children }: { children: ReactNode }) {
  const grupo = useRef<Group>(null!);
  const gl = useThree((s) => s.gl);
  const estado = useRef({ arrastrando: false, inicioX: 0, objetivo: 0, vel: 0, angulo: 0 });
  const quieto = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);

  useEffect(() => {
    const el = gl.domElement;
    const e = estado.current;
    const abajo = (ev: PointerEvent) => {
      e.arrastrando = true;
      e.inicioX = ev.clientX - e.objetivo * 260;
      el.style.cursor = 'grabbing';
    };
    const mover = (ev: PointerEvent) => {
      if (!e.arrastrando) return;
      const crudo = (ev.clientX - e.inicioX) / 260;
      // Más allá del tope cuesta más girar (como una goma).
      const tope = 0.5;
      e.objetivo = Math.abs(crudo) <= tope ? crudo : Math.sign(crudo) * (tope + (Math.abs(crudo) - tope) * 0.25);
    };
    const arriba = () => {
      e.arrastrando = false;
      e.objetivo = 0;
      el.style.cursor = 'grab';
    };
    el.style.cursor = 'grab';
    el.addEventListener('pointerdown', abajo);
    window.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', arriba);
    window.addEventListener('pointercancel', arriba);
    return () => {
      el.removeEventListener('pointerdown', abajo);
      window.removeEventListener('pointermove', mover);
      window.removeEventListener('pointerup', arriba);
      window.removeEventListener('pointercancel', arriba);
    };
  }, [gl]);

  useFrame(({ clock }, dtReal) => {
    const dt = Math.min(dtReal, 0.05);
    const e = estado.current;
    const respira = e.arrastrando || quieto ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.035;
    // resorte críticamente amortiguado
    const k = 90;
    const amort = 2 * Math.sqrt(k) * 0.85;
    const fuerza = (e.objetivo + respira - e.angulo) * k - e.vel * amort;
    e.vel += fuerza * dt;
    e.angulo += e.vel * dt;
    grupo.current.rotation.y = e.angulo;
  });

  return <group ref={grupo}>{children}</group>;
}
