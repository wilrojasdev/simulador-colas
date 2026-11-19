import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef, type RefObject } from 'react';
import type { Sprite } from 'three';
import type { Paleta3D } from '../../temas';
import { turno } from '../Basicos';
import { amortiguar, girarHacia, Muneco, usePartes } from './Muneco';
import { puntoAfuera, puntoRecorrido, type Plano3D, type Punto } from './plano';
import { clave, crearControl, mover, replanificar, vaAlMostrador, type Agente, type Control } from './movimiento';
import { texturaBoleto } from './texturas';

export type { Agente } from './movimiento';

export interface Opciones {
  velocidad: number;
  pausa: boolean;
}

export function Persona3D({
  agente,
  plano,
  paleta,
  opciones,
  posiciones,
  onFuera,
  caminando,
  fuentes,
}: {
  agente: Agente;
  plano: Plano3D;
  paleta: Paleta3D;
  opciones: RefObject<Opciones>;
  posiciones: RefObject<Map<number, Punto>>;
  onFuera: (id: number) => void;
  caminando: Set<number>;
  fuentes: boolean;
}) {
  const partes = usePartes();
  const boleto = useRef<Sprite>(null!);
  const s = agente.semilla;
  const tipo = s % 4; // 0: mira el celular, 1: mira alrededor, 2: se balancea, 3: zapatea
  const colores = useMemo(
    () => ({
      ropa: paleta.ropa[s % paleta.ropa.length],
      pantalon: paleta.pantalon[(s >>> 4) % paleta.pantalon.length],
      piel: paleta.piel[(s >>> 8) % paleta.piel.length],
      pelo: paleta.pelo[(s >>> 12) % paleta.pelo.length],
    }),
    [paleta, s],
  );
  const desfase = (s % 1000) / 159;

  const atendido = agente.estado !== 'fila';
  const textura = useMemo(
    () =>
      texturaBoleto(
        turno(agente.numero),
        atendido ? paleta.atendido : paleta.fila,
        atendido ? paleta.textoAtendido : '#1b1622',
      ),
    // `fuentes` vuelve a dibujar el boleto cuando termina de cargar la tipografía
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agente.numero, atendido, paleta, fuentes],
  );
  useEffect(() => () => textura.dispose(), [textura]);

  const control = useRef<Control | null>(null);
  const terminado = useRef(false);

  useEffect(() => {
    const mapa = posiciones.current;
    const id = agente.id;
    return () => {
      mapa?.delete(id);
      caminando.delete(id);
    };
  }, [agente.id, posiciones, caminando]);

  useFrame((_, dtReal) => {
    const o = opciones.current ?? { velocidad: 1, pausa: false };
    const factor = Math.pow(o.velocidad, 0.45);
    if (!control.current) control.current = crearControl(agente, plano, factor);
    const c = control.current;
    const dt = Math.min(dtReal, 0.05);
    c.t += dt;
    const dtMov = o.pausa ? 0 : dt;

    const k = clave(agente);
    if (k !== c.clave) {
      c.clave = k;
      replanificar(c, agente, plano, factor);
    }

    // --- desplazamiento ---
    const { dirX, dirZ, salio } = mover(c, plano, dtMov, factor);
    if (salio && !terminado.current) {
      terminado.current = true;
      onFuera(agente.id);
    }
    if (c.modo !== 'fuera') posiciones.current?.set(agente.id, { x: c.x, z: c.z });

    // Mientras va hacia el mostrador, el reloj de la simulación la espera.
    if (vaAlMostrador(c, agente)) caminando.add(agente.id);
    else caminando.delete(agente.id);

    // --- hacia dónde mira ---
    const moviendo = c.v > 0.05 && (dirX !== 0 || dirZ !== 0);
    let yawObjetivo = c.yaw;
    if (moviendo) yawObjetivo = Math.atan2(dirX, dirZ);
    else if (c.modo === 'quieto') yawObjetivo = Math.PI;
    else if (c.modo === 'fila') {
      const a = puntoRecorrido(plano, c.s);
      const b = puntoRecorrido(plano, c.s - 0.1);
      yawObjetivo = b.x === a.x && b.z === a.z ? Math.atan2(1, -0.7) : Math.atan2(b.x - a.x, b.z - a.z);
    }
    c.yaw = girarHacia(c.yaw, yawObjetivo, 11, dt);

    // --- cuerpo ---
    if (moviendo) c.quietoDesde = c.t;
    const quietoHace = c.t - c.quietoDesde;
    c.marcha = amortiguar(c.marcha, moviendo ? 1 : 0, 10, dt);
    c.fase += dtMov * c.v * 6.4;
    const quieto = 1 - c.marcha;
    const amplitud = (0.3 + Math.min(c.v, 4) * 0.13) * c.marcha;
    const paso = Math.sin(c.fase);
    const enMostrador = c.modo === 'quieto' && agente.estado === 'atendido';
    const t = c.t + desfase;

    const quiereCelular = tipo === 0 && c.modo === 'fila' && quietoHace > 0.8 ? 1 : 0;
    c.pose = amortiguar(c.pose, quiereCelular, 6, dt);
    if (c.salida >= 0) c.salida += dt;
    if (c.llamado >= 0) c.llamado += dt;
    const saludo = c.salida >= 0 && c.salida < 1 ? 1 - c.salida : 0;
    const salto = c.salida >= 0 && c.salida < 0.38 ? Math.sin((c.salida / 0.38) * Math.PI) * 0.16 : 0;

    const p = partes;
    p.raiz.current.position.set(c.x, 0, c.z);
    p.raiz.current.rotation.y = c.yaw;
    p.cuerpo.current.position.y = Math.abs(paso) * 0.045 * c.marcha + salto;
    p.cuerpo.current.rotation.x = Math.min(c.v, 4) * 0.035 * c.marcha;
    p.cuerpo.current.rotation.z = tipo === 2 ? Math.sin(t * 1.7) * 0.05 * quieto : 0;
    p.torso.current.scale.y = 1 + Math.sin(t * 2.4) * 0.025;

    const zapateo = tipo === 3 && c.modo === 'fila' ? Math.max(0, Math.sin(t * 6.5)) * -0.22 * quieto : 0;
    p.piernaI.current.rotation.x = paso * amplitud;
    p.piernaD.current.rotation.x = -paso * amplitud + zapateo;

    const apoyo = enMostrador ? (-0.85 + Math.sin(t * 2.3) * 0.08) * quieto : 0;
    p.brazoI.current.rotation.x = -paso * amplitud * 0.9 + apoyo;
    p.brazoI.current.rotation.z = -0.08;
    p.brazoD.current.rotation.x = paso * amplitud * 0.9 + apoyo - 1.25 * c.pose;
    p.brazoD.current.rotation.z = 0.08 - 0.4 * c.pose + saludo * (2.5 + Math.sin(t * 16) * 0.35);
    p.telefono.current.visible = c.pose > 0.3;

    p.cabeza.current.rotation.y = (tipo === 1 ? Math.sin(t * 0.55) * 0.75 : Math.sin(t * 0.3) * 0.15) * quieto * (1 - c.pose);
    p.cabeza.current.rotation.x = 0.38 * c.pose + (enMostrador ? Math.sin(t * 3.1) * 0.06 : 0);

    // Boleto: rebota cuando lo llaman y se encoge al salir.
    const rebote = c.llamado >= 0 && c.llamado < 0.5 ? Math.sin((c.llamado / 0.5) * Math.PI) * 0.4 : 0;
    const desaparece = c.salida >= 0 ? Math.max(0, 1 - c.salida / 0.5) : 1;
    const escala = (1 + rebote) * (0.6 + 0.4 * desaparece);
    boleto.current.scale.set(0.6 * escala, 0.33 * escala, 1);
    boleto.current.material.opacity = desaparece;
  });

  return (
    <Muneco partes={partes} colores={colores} posicion={[puntoAfuera(plano).x, 0, puntoAfuera(plano).z]}>
      <sprite ref={boleto} position={[0, 1.66, 0]} scale={[0.6, 0.33, 1]}>
        <spriteMaterial map={textura} transparent depthWrite={false} />
      </sprite>
    </Muneco>
  );
}
