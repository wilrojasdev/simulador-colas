import { useFrame } from '@react-three/fiber';
import type { MotionValue } from 'motion/react';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { BoxGeometry, CylinderGeometry, IcosahedronGeometry, type Group, type Mesh, type MeshStandardMaterial } from 'three';
import type { Cliente } from '../../lib/simulacion';
import type { Paleta3D } from '../../temas';
import { turno } from '../Basicos';
import { amortiguar, material, Muneco, usePartes } from './Muneco';
import type { Plano3D, Punto } from './plano';
import { texturaBaldosas, texturaCartel } from './texturas';

const CAJA = new BoxGeometry(1, 1, 1);
const POSTE = new CylinderGeometry(0.035, 0.035, 0.9, 10);
const BASE = new CylinderGeometry(0.13, 0.15, 0.04, 16);
const HOJA = new IcosahedronGeometry(0.22, 1);
const MACETA = new CylinderGeometry(0.2, 0.15, 0.38, 16);

const GROSOR = 0.14;
const VANO = 0.96;
const ALTO_VANO = 2.05;

/** Una caja con esquina en (x0, y0, z0) y medidas (a, b, c). */
function Bloque({
  desde,
  medidas,
  color,
  sombra = true,
}: {
  desde: [number, number, number];
  medidas: [number, number, number];
  color: string;
  sombra?: boolean;
}) {
  return (
    <mesh
      geometry={CAJA}
      material={material(color)}
      position={[desde[0] + medidas[0] / 2, desde[1] + medidas[1] / 2, desde[2] + medidas[2] / 2]}
      scale={medidas}
      castShadow={sombra}
      receiveShadow
    />
  );
}

/** Piso, paredes con sus puertas, carteles, plantas y el reloj. */
export function Habitacion({
  plano,
  paleta,
  posiciones,
  reloj,
  fuentes,
}: {
  plano: Plano3D;
  paleta: Paleta3D;
  posiciones: RefObject<Map<number, Punto>>;
  reloj: MotionValue<number>;
  fuentes: boolean;
}) {
  const { ancho, fondo, alturaPared: alto, zEntrada, xSalida } = plano;
  const baldosas = useMemo(() => {
    const t = texturaBaldosas(paleta.baldosaA, paleta.baldosaB);
    t.repeat.set(ancho / 1.2, fondo / 1.2);
    return t;
  }, [paleta, ancho, fondo]);
  useEffect(() => () => baldosas.dispose(), [baldosas]);

  return (
    <group>
      {/* Base de la maqueta y piso */}
      <Bloque desde={[-GROSOR, -0.22, -GROSOR]} medidas={[ancho + GROSOR, 0.2, fondo + GROSOR]} color={paleta.zocalo} sombra={false} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ancho / 2, -0.015, fondo / 2]} receiveShadow>
        <planeGeometry args={[ancho, fondo]} />
        <meshStandardMaterial map={baldosas} roughness={0.55} />
      </mesh>

      {/* Pared del fondo con la salida */}
      <Bloque desde={[-GROSOR, 0, -GROSOR]} medidas={[xSalida - VANO / 2 + GROSOR, alto, GROSOR]} color={paleta.pared} />
      <Bloque desde={[xSalida + VANO / 2, 0, -GROSOR]} medidas={[ancho - xSalida - VANO / 2, alto, GROSOR]} color={paleta.pared} />
      <Bloque desde={[xSalida - VANO / 2, ALTO_VANO, -GROSOR]} medidas={[VANO, alto - ALTO_VANO, GROSOR]} color={paleta.pared} />
      <Bloque desde={[0, 0, 0]} medidas={[xSalida - VANO / 2, 0.14, 0.03]} color={paleta.zocalo} sombra={false} />
      <Bloque desde={[xSalida + VANO / 2, 0, 0]} medidas={[ancho - xSalida - VANO / 2, 0.14, 0.03]} color={paleta.zocalo} sombra={false} />

      {/* Pared izquierda con la entrada */}
      <Bloque desde={[-GROSOR, 0, 0]} medidas={[GROSOR, alto, zEntrada - VANO / 2]} color={paleta.pared} />
      <Bloque desde={[-GROSOR, 0, zEntrada + VANO / 2]} medidas={[GROSOR, alto, fondo - zEntrada - VANO / 2]} color={paleta.pared} />
      <Bloque desde={[-GROSOR, ALTO_VANO, zEntrada - VANO / 2]} medidas={[GROSOR, alto - ALTO_VANO, VANO]} color={paleta.pared} />
      <Bloque desde={[0, 0, 0]} medidas={[0.03, 0.14, zEntrada - VANO / 2]} color={paleta.zocalo} sombra={false} />
      <Bloque desde={[0, 0, zEntrada + VANO / 2]} medidas={[0.03, 0.14, fondo - zEntrada - VANO / 2]} color={paleta.zocalo} sombra={false} />

      <Puerta centro={{ x: 0, z: zEntrada }} eje="z" paleta={paleta} posiciones={posiciones} />
      <Puerta centro={{ x: xSalida, z: 0 }} eje="x" paleta={paleta} posiciones={posiciones} />

      <Cartel
        lineas={['ENTRADA']}
        posicion={[0.03, ALTO_VANO + 0.22, zEntrada]}
        rotacion={[0, Math.PI / 2, 0]}
        medidas={[0.9, 0.26]}
        fondo={paleta.atendido}
        color={paleta.fila}
        noche={paleta.noche}
        fuentes={fuentes}
      />
      <Cartel
        lineas={['SALIDA']}
        posicion={[xSalida, ALTO_VANO + 0.22, 0.03]}
        rotacion={[0, 0, 0]}
        medidas={[0.9, 0.26]}
        fondo="#1f7a4d"
        color="#ffffff"
        noche={paleta.noche}
        fuentes={fuentes}
      />

      <Planta posicion={[0.45, 0, 0.45]} paleta={paleta} semilla={1} />
      <Planta posicion={[ancho - 0.45, 0, fondo - 0.5]} paleta={paleta} semilla={2} />

      <Reloj3D posicion={[0.03, 1.75, Math.min(1.7, zEntrada - 1.2)]} paleta={paleta} reloj={reloj} />
    </group>
  );
}

/** Puerta corrediza de vidrio que se abre sola cuando alguien se acerca. */
function Puerta({
  centro,
  eje,
  paleta,
  posiciones,
}: {
  centro: Punto;
  eje: 'x' | 'z';
  paleta: Paleta3D;
  posiciones: RefObject<Map<number, Punto>>;
}) {
  const hojaA = useRef<Mesh>(null!);
  const hojaB = useRef<Mesh>(null!);
  const apertura = useRef(0);
  const vidrio = useMemo(() => material('#bfe3ff', { rugosidad: 0.1 }).clone(), []);
  useEffect(() => {
    vidrio.transparent = true;
    vidrio.opacity = 0.35;
    return () => vidrio.dispose();
  }, [vidrio]);

  useFrame((_, dt) => {
    let cerca = false;
    for (const p of posiciones.current?.values() ?? []) {
      if (Math.hypot(p.x - centro.x, p.z - centro.z) < 1.35) {
        cerca = true;
        break;
      }
    }
    apertura.current = amortiguar(apertura.current, cerca ? 1 : 0, cerca ? 9 : 4, Math.min(dt, 0.05));
    const d = VANO / 4 + apertura.current * (VANO / 2 - 0.04);
    if (eje === 'z') {
      hojaA.current.position.z = centro.z - d;
      hojaB.current.position.z = centro.z + d;
    } else {
      hojaA.current.position.x = centro.x - d;
      hojaB.current.position.x = centro.x + d;
    }
  });

  const medidas: [number, number, number] = eje === 'z' ? [0.03, ALTO_VANO - 0.05, VANO / 2] : [VANO / 2, ALTO_VANO - 0.05, 0.03];
  const marco = material(paleta.metal, { rugosidad: 0.35, metal: 0.5 });
  const lateral: [number, number, number] = eje === 'z' ? [GROSOR + 0.04, ALTO_VANO, 0.06] : [0.06, ALTO_VANO, GROSOR + 0.04];
  const fuera = eje === 'z' ? -GROSOR / 2 : 0;
  return (
    <group>
      <mesh ref={hojaA} geometry={CAJA} material={vidrio} scale={medidas} position={[centro.x + fuera, ALTO_VANO / 2, centro.z + (eje === 'x' ? -GROSOR / 2 : 0)]} />
      <mesh ref={hojaB} geometry={CAJA} material={vidrio} scale={medidas} position={[centro.x + fuera, ALTO_VANO / 2, centro.z + (eje === 'x' ? -GROSOR / 2 : 0)]} />
      {[-1, 1].map((lado) => (
        <mesh
          key={lado}
          geometry={CAJA}
          material={marco}
          scale={lateral}
          position={
            eje === 'z'
              ? [-GROSOR / 2, ALTO_VANO / 2, centro.z + lado * (VANO / 2)]
              : [centro.x + lado * (VANO / 2), ALTO_VANO / 2, -GROSOR / 2]
          }
        />
      ))}
    </group>
  );
}

/** Cartel plano con texto; de noche brilla. */
export function Cartel({
  lineas,
  posicion,
  rotacion,
  medidas,
  fondo,
  color,
  noche,
  fuentes,
}: {
  lineas: string[];
  posicion: [number, number, number];
  rotacion: [number, number, number];
  medidas: [number, number];
  fondo: string;
  color: string;
  noche: boolean;
  fuentes: boolean;
}) {
  const clave = lineas.join('\n');
  const textura = useMemo(
    () => texturaCartel(clave.split('\n'), fondo, color, { ancho: 512, alto: Math.round((512 * medidas[1]) / medidas[0]), tamaño: 92, brillo: noche }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clave, fondo, color, noche, medidas[0], medidas[1], fuentes],
  );
  useEffect(() => () => textura.dispose(), [textura]);
  return (
    <mesh position={posicion} rotation={rotacion}>
      <planeGeometry args={medidas} />
      <meshBasicMaterial map={textura} toneMapped={false} />
    </mesh>
  );
}

function Planta({ posicion, paleta, semilla }: { posicion: [number, number, number]; paleta: Paleta3D; semilla: number }) {
  const copa = useRef<Group>(null!);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime + semilla * 1.7;
    copa.current.rotation.z = Math.sin(t * 0.9) * 0.04;
    copa.current.rotation.x = Math.cos(t * 0.7) * 0.03;
  });
  const hoja = useMemo(() => material(paleta.planta, { rugosidad: 0.9 }).clone(), [paleta.planta]);
  useEffect(() => {
    hoja.flatShading = true;
    hoja.needsUpdate = true;
    return () => hoja.dispose();
  }, [hoja]);
  return (
    <group position={posicion}>
      <mesh geometry={MACETA} material={material(paleta.maceta)} position={[0, 0.19, 0]} castShadow receiveShadow />
      <group ref={copa} position={[0, 0.38, 0]}>
        {[
          [0, 0.22, 0, 1.15],
          [0.14, 0.42, 0.05, 0.9],
          [-0.12, 0.38, -0.06, 0.85],
          [0.02, 0.6, -0.02, 0.7],
        ].map(([x, y, z, e], i) => (
          <mesh key={i} geometry={HOJA} material={hoja} position={[x, y, z]} scale={e} castShadow />
        ))}
      </group>
    </group>
  );
}

/** Reloj de pared: las agujas avanzan con el tiempo simulado. */
function Reloj3D({ posicion, paleta, reloj }: { posicion: [number, number, number]; paleta: Paleta3D; reloj: MotionValue<number> }) {
  const horas = useRef<Group>(null!);
  const minutos = useRef<Group>(null!);
  useFrame(() => {
    const t = reloj.get();
    minutos.current.rotation.x = -(t % 1) * Math.PI * 2;
    horas.current.rotation.x = -((t / 12) % 1) * Math.PI * 2;
  });
  const tinta = material(paleta.atendido);
  return (
    <group position={posicion} rotation={[0, 0, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} material={material(paleta.metal, { rugosidad: 0.4, metal: 0.4 })}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 32]} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.03, 0, 0]} material={material('#fffdf7', { rugosidad: 0.6 })}>
        <cylinderGeometry args={[0.26, 0.26, 0.02, 32]} />
      </mesh>
      <group ref={horas} position={[0.05, 0, 0]}>
        <mesh geometry={CAJA} material={tinta} scale={[0.02, 0.15, 0.035]} position={[0, 0.07, 0]} />
      </group>
      <group ref={minutos} position={[0.055, 0, 0]}>
        <mesh geometry={CAJA} material={tinta} scale={[0.02, 0.22, 0.022]} position={[0, 0.1, 0]} />
      </group>
    </group>
  );
}

/** Postes y cintas que arman el zigzag, con dos cintas retráctiles que abren atajos, y la línea de "espere aquí". */
export function Cintas3D({
  plano,
  paleta,
  entrada,
  posiciones,
}: {
  plano: Plano3D;
  paleta: Paleta3D;
  /** por qué vuelta se entra ahora (1, 2 o 3) */
  entrada: number;
  posiciones: RefObject<Map<number, Punto>>;
}) {
  const { x0, x1, zFilas, paso } = plano;
  const h = paso / 2;
  const xI = x0 - 0.42;
  const xD = x1 + 0.3;
  const tramos: [Punto, Punto][] = [
    [{ x: xI, z: zFilas[0] - h }, { x: xD, z: zFilas[0] - h }],
    [{ x: x0 + 0.36, z: zFilas[0] + h }, { x: xD, z: zFilas[0] + h }],
    [{ x: xI, z: zFilas[1] + h }, { x: x1 - 0.36, z: zFilas[1] + h }],
    [{ x: xI, z: zFilas[2] + h }, { x: xD, z: zFilas[2] + h }],
    [{ x: xD, z: zFilas[1] + h }, { x: xD, z: zFilas[2] + h }],
    [{ x: xI, z: zFilas[0] + h }, { x: xI, z: zFilas[1] + h }],
  ];
  // Cintas retráctiles: se recogen hacia el poste para dejar pasar.
  const compuertas: { desde: Punto; hasta: Punto; vuelta: number }[] = [
    { desde: { x: xI, z: zFilas[0] + h }, hasta: { x: xI, z: zFilas[0] - h }, vuelta: 1 },
    { desde: { x: xD, z: zFilas[1] + h }, hasta: { x: xD, z: zFilas[0] + h }, vuelta: 2 },
  ];
  const postes = new Map<string, Punto>();
  for (const [a, b] of [...tramos, ...compuertas.map((c) => [c.desde, c.hasta] as [Punto, Punto])]) {
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 1.6));
    for (let i = 0; i <= n; i++) {
      const p = { x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n };
      postes.set(`${p.x.toFixed(2)},${p.z.toFixed(2)}`, p);
    }
  }
  const metal = material(paleta.metal, { rugosidad: 0.3, metal: 0.6 });
  const cinta = material(paleta.cinta, { rugosidad: 0.6 });
  return (
    <group>
      {[...postes.values()].map((p) => (
        <group key={`${p.x},${p.z}`} position={[p.x, 0, p.z]}>
          <mesh geometry={BASE} material={metal} position={[0, 0.02, 0]} castShadow />
          <mesh geometry={POSTE} material={metal} position={[0, 0.45, 0]} castShadow />
          <mesh material={metal} position={[0, 0.92, 0]}>
            <sphereGeometry args={[0.05, 12, 8]} />
          </mesh>
        </group>
      ))}
      {tramos.map(([a, b], i) => {
        const largo = Math.hypot(b.x - a.x, b.z - a.z);
        return (
          <mesh
            key={i}
            geometry={CAJA}
            material={cinta}
            position={[(a.x + b.x) / 2, 0.84, (a.z + b.z) / 2]}
            rotation={[0, -Math.atan2(b.z - a.z, b.x - a.x), 0]}
            scale={[largo, 0.06, 0.015]}
            castShadow
          />
        );
      })}
      {compuertas.map((c) => (
        <Compuerta key={c.vuelta} {...c} abierta={entrada === c.vuelta} material={cinta} posiciones={posiciones} />
      ))}
      {/* Línea en el piso donde espera el primero */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x1 + 0.42, 0.002, zFilas[0]]}>
        <planeGeometry args={[0.08, paso * 0.9]} />
        <meshBasicMaterial color={paleta.fila} toneMapped={false} />
      </mesh>
    </group>
  );
}

const CINTA_DESDE_ORIGEN = new BoxGeometry(1, 1, 1).translate(0.5, 0, 0);

function Compuerta({
  desde,
  hasta,
  abierta,
  material: mat,
  posiciones,
}: {
  desde: Punto;
  hasta: Punto;
  abierta: boolean;
  material: MeshStandardMaterial;
  posiciones: RefObject<Map<number, Punto>>;
}) {
  const cinta = useRef<Mesh>(null!);
  const largo = Math.hypot(hasta.x - desde.x, hasta.z - desde.z);
  const medio = { x: (desde.x + hasta.x) / 2, z: (desde.z + hasta.z) / 2 };
  const extension = useRef(abierta ? 0 : 1);
  const datos = useRef(abierta);
  datos.current = abierta;
  useFrame((_, dt) => {
    // No se cierra en la cara de nadie: espera a que no haya gente cruzando.
    let alguien = false;
    for (const p of posiciones.current?.values() ?? []) {
      if (Math.hypot(p.x - medio.x, p.z - medio.z) < 0.75) {
        alguien = true;
        break;
      }
    }
    const objetivo = datos.current || alguien ? 0.04 : 1;
    extension.current = amortiguar(extension.current, objetivo, 7, Math.min(dt, 0.05));
    cinta.current.scale.x = largo * extension.current;
  });
  return (
    <mesh
      ref={cinta}
      geometry={CINTA_DESDE_ORIGEN}
      material={mat}
      position={[desde.x, 0.84, desde.z]}
      rotation={[0, -Math.atan2(hasta.z - desde.z, hasta.x - desde.x), 0]}
      scale={[largo, 0.06, 0.015]}
      castShadow
    />
  );
}

/** Mostrador con su cajero, la lámpara de libre/ocupado, el cartel con el turno y la barra de avance. */
export function Mostrador3D({
  x,
  plano,
  paleta,
  etiqueta,
  cliente,
  reloj,
  fuentes,
  semilla,
}: {
  x: number;
  plano: Plano3D;
  paleta: Paleta3D;
  etiqueta: string;
  cliente: Cliente | null;
  reloj: MotionValue<number>;
  fuentes: boolean;
  semilla: number;
}) {
  const z = plano.zMostrador;
  const relleno = useRef<Mesh>(null!);
  const lampara = useRef<Mesh>(null!);
  const ocupado = cliente !== null;
  const datos = useRef({ inicio: 0, fin: 1, ocupado });
  datos.current = { inicio: cliente?.inicio ?? 0, fin: cliente?.fin ?? 1, ocupado };
  const pantalla = material(paleta.noche ? '#7fd1ff' : '#9ad7ff', { brillo: paleta.noche ? 1.4 : 0.5, rugosidad: 0.3 });

  useFrame(() => {
    const { inicio, fin, ocupado: o } = datos.current;
    const avance = o ? Math.min(1, Math.max(0, (reloj.get() - inicio) / (fin - inicio || 1))) : 0;
    relleno.current.scale.x = Math.max(0.0001, avance * 0.58);
  });

  return (
    <group>
      {/* mueble y mesada */}
      <Bloque desde={[x - 0.52, 0, z - 0.25]} medidas={[1.04, 0.82, 0.5]} color={paleta.mueble} />
      <Bloque desde={[x - 0.58, 0.82, z - 0.3]} medidas={[1.16, 0.06, 0.62]} color={paleta.mesada} />
      {/* monitor mirando al cajero */}
      <Bloque desde={[x - 0.32, 0.88, z - 0.2]} medidas={[0.06, 0.12, 0.06]} color="#2b2b33" />
      <mesh position={[x - 0.29, 1.08, z - 0.17]} geometry={CAJA} material={material('#2b2b33')} scale={[0.36, 0.24, 0.03]} castShadow />
      <mesh position={[x - 0.29, 1.08, z - 0.19]} geometry={CAJA} material={pantalla} scale={[0.32, 0.2, 0.01]} />
      {/* lámpara: verde libre, naranja ocupado */}
      <mesh ref={lampara} position={[x + 0.4, 0.95, z + 0.12]} material={material(ocupado ? paleta.ocupado : paleta.libre, { brillo: 1.6 })}>
        <sphereGeometry args={[0.06, 16, 12]} />
      </mesh>
      {paleta.noche && <pointLight position={[x, 1.9, z + 0.8]} color="#ffcf8a" intensity={5} distance={3.6} decay={2} />}

      <Cajero x={x} z={plano.zPersonal} paleta={paleta} ocupado={ocupado} semilla={semilla} />

      {/* cartel en la pared con la ventanilla y el turno que atiende */}
      <Cartel
        lineas={[etiqueta, cliente ? turno(cliente.numero) : 'libre']}
        posicion={[x, 1.98, 0.02]}
        rotacion={[0, 0, 0]}
        medidas={[0.62, 0.42]}
        fondo="#151a21"
        color={cliente ? '#ffa31a' : '#6fe3a5'}
        noche={paleta.noche}
        fuentes={fuentes}
      />
      <mesh position={[x, 1.72, 0.025]}>
        <planeGeometry args={[0.62, 0.06]} />
        <meshBasicMaterial color="#151a21" toneMapped={false} />
      </mesh>
      <mesh ref={relleno} position={[x - 0.29, 1.72, 0.03]} scale={[0.0001, 1, 1]}>
        <planeGeometry args={[1, 0.035]} />
        <meshBasicMaterial color="#ffa31a" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** El cajero: teclea mientras atiende y, cuando está libre, mira alrededor y llama al siguiente. */
function Cajero({ x, z, paleta, ocupado, semilla }: { x: number; z: number; paleta: Paleta3D; ocupado: boolean; semilla: number }) {
  const partes = usePartes();
  const estado = useRef({ ocupado, cambio: 0, t: semilla * 3.1 });
  if (estado.current.ocupado !== ocupado) {
    estado.current.ocupado = ocupado;
    estado.current.cambio = 0;
  }
  const colores = useMemo(
    () => ({
      ropa: paleta.personal,
      pantalon: paleta.pantalon[0],
      piel: paleta.piel[(semilla * 3) % paleta.piel.length],
      pelo: paleta.pelo[(semilla * 5) % paleta.pelo.length],
    }),
    [paleta, semilla],
  );
  const teclear = useRef(0);
  useFrame((_, dtReal) => {
    const dt = Math.min(dtReal, 0.05);
    const e = estado.current;
    e.t += dt;
    e.cambio += dt;
    teclear.current = amortiguar(teclear.current, e.ocupado ? 1 : 0, 6, dt);
    const k = teclear.current;
    const t = e.t;
    // Al quedar libre levanta la mano para llamar al siguiente.
    const llama = !e.ocupado && e.cambio < 0.9 ? Math.sin((e.cambio / 0.9) * Math.PI) : 0;
    const p = partes;
    p.brazoI.current.rotation.x = k * (-1.05 + Math.sin(t * 19) * 0.1);
    p.brazoD.current.rotation.x = k * (-1.05 + Math.sin(t * 19 + 2) * 0.1);
    p.brazoD.current.rotation.z = 0.08 + llama * 2.4;
    p.brazoI.current.rotation.z = -0.08;
    p.cabeza.current.rotation.y = (1 - k) * Math.sin(t * 0.5) * 0.6 + k * Math.sin(t * 0.8) * 0.12;
    p.cabeza.current.rotation.x = k * (0.12 + Math.sin(t * 2.6) * 0.05);
    p.torso.current.scale.y = 1 + Math.sin(t * 2.2) * 0.02;
  });
  return <Muneco partes={partes} colores={colores} posicion={[x, 0, z]} />;
}
