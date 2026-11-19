import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

const FUENTE = '"Barlow Condensed", "Barlow", sans-serif';

function lienzo(ancho: number, alto: number) {
  const c = document.createElement('canvas');
  c.width = ancho;
  c.height = alto;
  return [c, c.getContext('2d')!] as const;
}

function textura(c: HTMLCanvasElement) {
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Boleto de turno con muescas a los lados, para flotar sobre la cabeza. */
export function texturaBoleto(texto: string, fondo: string, color: string): CanvasTexture {
  const [c, g] = lienzo(176, 96);
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.roundRect(8, 12, 160, 80, 16);
  g.fill();
  g.fillStyle = fondo;
  g.beginPath();
  g.roundRect(8, 6, 160, 80, 16);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  for (const x of [8, 168]) {
    g.beginPath();
    g.arc(x, 46, 11, 0, Math.PI * 2);
    g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  g.fillStyle = color;
  g.font = `700 60px ${FUENTE}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(texto, 88, 50);
  return textura(c);
}

/** Cartel rectangular con una o dos líneas de texto. */
export function texturaCartel(
  lineas: string[],
  fondo: string,
  color: string,
  { ancho = 512, alto = 160, tamaño = 84, brillo = false }: { ancho?: number; alto?: number; tamaño?: number; brillo?: boolean } = {},
): CanvasTexture {
  const [c, g] = lienzo(ancho, alto);
  g.fillStyle = fondo;
  g.beginPath();
  g.roundRect(0, 0, ancho, alto, 18);
  g.fill();
  g.fillStyle = color;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  if (brillo) {
    g.shadowColor = color;
    g.shadowBlur = 18;
  }
  const alturaLinea = alto / lineas.length;
  lineas.forEach((l, i) => {
    g.font = `700 ${i === 0 ? tamaño : tamaño * 0.8}px ${FUENTE}`;
    g.fillText(l, ancho / 2, alturaLinea * (i + 0.5) + 4);
  });
  return textura(c);
}

/** Baldosas del piso: dos tonos en damero con juntas finas. Se repite por metro. */
export function texturaBaldosas(a: string, b: string): CanvasTexture {
  const [c, g] = lienzo(256, 256);
  const m = 128;
  for (let i = 0; i < 2; i++) {
    for (let j = 0; j < 2; j++) {
      g.fillStyle = (i + j) % 2 === 0 ? a : b;
      g.fillRect(i * m, j * m, m, m);
    }
  }
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.lineWidth = 3;
  for (const v of [0, m, 256]) {
    g.beginPath();
    g.moveTo(v, 0);
    g.lineTo(v, 256);
    g.moveTo(0, v);
    g.lineTo(256, v);
    g.stroke();
  }
  const t = textura(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}
