import { useRef, type ReactNode, type RefObject } from 'react';
import { BoxGeometry, CapsuleGeometry, MeshStandardMaterial, SphereGeometry, type Group, type Mesh } from 'three';

/** Geometrías compartidas por todos los muñecos (se crean una sola vez). */
const GEO = {
  pierna: new CapsuleGeometry(0.065, 0.3, 4, 10),
  zapato: new BoxGeometry(0.11, 0.06, 0.18),
  torso: new CapsuleGeometry(0.17, 0.2, 6, 16),
  brazo: new CapsuleGeometry(0.05, 0.24, 4, 10),
  mano: new SphereGeometry(0.056, 12, 8),
  cabeza: new SphereGeometry(0.17, 24, 18),
  pelo: new SphereGeometry(0.182, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
  ojo: new SphereGeometry(0.022, 8, 6),
  telefono: new BoxGeometry(0.075, 0.13, 0.016),
};

const materiales = new Map<string, MeshStandardMaterial>();

/** Material mate tipo arcilla, uno por color. */
export function material(color: string, { brillo = 0, rugosidad = 0.8, metal = 0 } = {}): MeshStandardMaterial {
  const clave = `${color}|${brillo}|${rugosidad}|${metal}`;
  let m = materiales.get(clave);
  if (!m) {
    m = new MeshStandardMaterial({
      color,
      roughness: rugosidad,
      metalness: metal,
      emissive: brillo ? color : '#000000',
      emissiveIntensity: brillo,
    });
    materiales.set(clave, m);
  }
  return m;
}

export interface Partes {
  raiz: RefObject<Group>;
  cuerpo: RefObject<Group>;
  piernaI: RefObject<Group>;
  piernaD: RefObject<Group>;
  torso: RefObject<Group>;
  brazoI: RefObject<Group>;
  brazoD: RefObject<Group>;
  cabeza: RefObject<Group>;
  telefono: RefObject<Mesh>;
}

export function usePartes(): Partes {
  return {
    raiz: useRef<Group>(null!),
    cuerpo: useRef<Group>(null!),
    piernaI: useRef<Group>(null!),
    piernaD: useRef<Group>(null!),
    torso: useRef<Group>(null!),
    brazoI: useRef<Group>(null!),
    brazoD: useRef<Group>(null!),
    cabeza: useRef<Group>(null!),
    telefono: useRef<Mesh>(null!),
  };
}

export interface Colores {
  ropa: string;
  pantalon: string;
  piel: string;
  pelo: string;
}

/**
 * Un muñeco de plastilina de ~1,3 m que mira hacia +z. Las articulaciones (piernas, brazos, cabeza)
 * son grupos con el pivote en la cadera, el hombro y el cuello, para animarlos rotándolos.
 */
export function Muneco({
  partes,
  colores,
  posicion,
  children,
}: {
  partes: Partes;
  colores: Colores;
  posicion?: [number, number, number];
  children?: ReactNode;
}) {
  const ropa = material(colores.ropa);
  const pantalon = material(colores.pantalon);
  const piel = material(colores.piel, { rugosidad: 0.7 });
  const pelo = material(colores.pelo, { rugosidad: 0.9 });
  const oscuro = material('#1b1622', { rugosidad: 0.4 });
  return (
    <group ref={partes.raiz} position={posicion}>
      <group ref={partes.cuerpo}>
        {([-1, 1] as const).map((lado) => (
          <group key={lado} ref={lado < 0 ? partes.piernaI : partes.piernaD} position={[0.085 * lado, 0.5, 0]}>
            <mesh geometry={GEO.pierna} material={pantalon} position={[0, -0.2, 0]} castShadow />
            <mesh geometry={GEO.zapato} material={oscuro} position={[0, -0.47, 0.03]} castShadow />
          </group>
        ))}
        <group ref={partes.torso} position={[0, 0.74, 0]}>
          <mesh geometry={GEO.torso} material={ropa} scale={[1, 1, 0.82]} castShadow />
        </group>
        {([-1, 1] as const).map((lado) => (
          <group key={lado} ref={lado < 0 ? partes.brazoI : partes.brazoD} position={[0.215 * lado, 0.93, 0]}>
            <mesh geometry={GEO.brazo} material={ropa} position={[0, -0.16, 0]} castShadow />
            <mesh geometry={GEO.mano} material={piel} position={[0, -0.34, 0]} castShadow />
            {lado > 0 && (
              <mesh
                ref={partes.telefono}
                geometry={GEO.telefono}
                material={oscuro}
                position={[0, -0.39, 0.05]}
                visible={false}
              />
            )}
          </group>
        ))}
        <group ref={partes.cabeza} position={[0, 1.14, 0]}>
          <mesh geometry={GEO.cabeza} material={piel} castShadow />
          <mesh geometry={GEO.pelo} material={pelo} rotation={[-0.3, 0, 0]} castShadow />
          <mesh geometry={GEO.ojo} material={oscuro} position={[-0.062, 0.015, 0.157]} />
          <mesh geometry={GEO.ojo} material={oscuro} position={[0.062, 0.015, 0.157]} />
        </group>
        {children}
      </group>
    </group>
  );
}

/** Interpolación con suavizado independiente de los fps. */
export function amortiguar(actual: number, objetivo: number, rapidez: number, dt: number): number {
  return actual + (objetivo - actual) * (1 - Math.exp(-rapidez * dt));
}

/** Gira el ángulo actual hacia el objetivo por el lado más corto. */
export function girarHacia(actual: number, objetivo: number, rapidez: number, dt: number): number {
  const dif = Math.atan2(Math.sin(objetivo - actual), Math.cos(objetivo - actual));
  return actual + dif * (1 - Math.exp(-rapidez * dt));
}
