import { createContext, useContext } from 'react';

export type Tema = 'arcilla' | 'noche' | 'clasico';

export const TEMAS: { id: Tema; nombre: string; descripcion: string }[] = [
  { id: 'arcilla', nombre: 'Arcilla', descripcion: 'Claro y cálido, como una maqueta de plastilina' },
  { id: 'noche', nombre: 'Noche', descripcion: 'Oscuro, con luces cálidas y el tablero encendido' },
  { id: 'clasico', nombre: 'Banco clásico', descripcion: 'Mármol, madera y bronce' },
];

/** Colores de la sala en 3D para cada tema. Los de la página viven en index.css ([data-tema]). */
export interface Paleta3D {
  fondo: string;
  baldosaA: string;
  baldosaB: string;
  pared: string;
  zocalo: string;
  mueble: string;
  mesada: string;
  metal: string;
  cinta: string;
  /** boleto de quien espera */
  fila: string;
  /** boleto de quien está siendo atendido */
  atendido: string;
  textoAtendido: string;
  libre: string;
  ocupado: string;
  planta: string;
  maceta: string;
  ropa: string[];
  pantalon: string[];
  pelo: string[];
  piel: string[];
  personal: string;
  cielo: string;
  suelo: string;
  luzAmbiente: number;
  luzSol: number;
  colorSol: string;
  /** lámparas encendidas en el techo y brillo en los letreros */
  noche: boolean;
}

const PIEL = ['#f3d2b3', '#e2b48a', '#c98d5f', '#9c6541', '#6f4428'];

export const PALETAS: Record<Tema, Paleta3D> = {
  arcilla: {
    fondo: '#efe6da',
    baldosaA: '#f1e4d3',
    baldosaB: '#e6d5c0',
    pared: '#f6d9c4',
    zocalo: '#d98f6b',
    mueble: '#8fb8a8',
    mesada: '#fff6ea',
    metal: '#2b2135',
    cinta: '#e2574c',
    fila: '#ffb627',
    atendido: '#2b2135',
    textoAtendido: '#fffaf2',
    libre: '#47c28b',
    ocupado: '#ff8a3d',
    planta: '#5fae6e',
    maceta: '#d98f6b',
    ropa: ['#6c9bd2', '#e2574c', '#9b7fd1', '#4fb3a9', '#f08fb0', '#7cc36f', '#5b6ee1', '#f2a65a'],
    pantalon: ['#2b2135', '#4a3f5c', '#35506b', '#5c4033'],
    pelo: ['#2b1d16', '#5a3825', '#b3763d', '#e8c27a', '#1d1d24', '#8a8a96'],
    piel: PIEL,
    personal: '#2b2135',
    cielo: '#fff4e6',
    suelo: '#d9b99b',
    luzAmbiente: 1.25,
    luzSol: 2.2,
    colorSol: '#fff1de',
    noche: false,
  },
  noche: {
    fondo: '#0e1020',
    baldosaA: '#262a4a',
    baldosaB: '#1f2340',
    pared: '#2c2f55',
    zocalo: '#151833',
    mueble: '#3a3f73',
    mesada: '#4b5190',
    metal: '#c9ceff',
    cinta: '#ff5d73',
    fila: '#ffd23f',
    atendido: '#0e1020',
    textoAtendido: '#ffd23f',
    libre: '#3dffa8',
    ocupado: '#ff9f40',
    planta: '#3f8f6a',
    maceta: '#5a4a8a',
    ropa: ['#ff6b8b', '#4cc9f0', '#b388ff', '#ffd23f', '#5eead4', '#f97316', '#a3e635', '#f472b6'],
    pantalon: ['#11132a', '#1e2147', '#2d1f47', '#0f2a3a'],
    pelo: ['#120c0a', '#3b2416', '#a0652f', '#e8c27a', '#0d0d12', '#7c7c8c'],
    piel: PIEL,
    personal: '#c9ceff',
    cielo: '#5b5fb0',
    suelo: '#0e1020',
    luzAmbiente: 0.45,
    luzSol: 0.55,
    colorSol: '#9aa4ff',
    noche: true,
  },
  clasico: {
    fondo: '#e9e4d8',
    baldosaA: '#f4f1ea',
    baldosaB: '#2f3a36',
    pared: '#e8e0cc',
    zocalo: '#6b4a2e',
    mueble: '#7a4f2c',
    mesada: '#f2ede2',
    metal: '#c9a227',
    cinta: '#1d3b2f',
    fila: '#d4a72c',
    atendido: '#1d3b2f',
    textoAtendido: '#f9f6ef',
    libre: '#3fae6b',
    ocupado: '#d9822b',
    planta: '#4c7a4f',
    maceta: '#c9a227',
    ropa: ['#1d3b2f', '#7a2e2e', '#2f4b7a', '#c9b48a', '#5e4b7a', '#3c6e5a', '#8a5a2b', '#4a4a4a'],
    pantalon: ['#1f1f24', '#2e2a26', '#26303b', '#3b2e24'],
    pelo: ['#1f150f', '#4a2f1d', '#8c5a2e', '#d8b56e', '#151518', '#9a9aa2'],
    piel: PIEL,
    personal: '#1d3b2f',
    cielo: '#fffaf0',
    suelo: '#bfae8a',
    luzAmbiente: 1.15,
    luzSol: 2.0,
    colorSol: '#fff3dc',
    noche: false,
  },
};

export const TemaContexto = createContext<Tema>('arcilla');

export function useTema(): Tema {
  return useContext(TemaContexto);
}
