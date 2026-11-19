# Simulador de colas

Simulador animado de teoría de colas para los modelos M/M/1, M/D/1, M/M/s y M/G/1. Eliges el modelo, pones tus datos y ves la fila funcionar en una sala en 3D, con los resultados, las gráficas y cada fórmula explicada paso a paso.

La página va en seis pasos: **Modelo → Tus datos → Sala en vivo → Resultados → Gráficas → Paso a paso**.

## Cómo correrlo

```bash
npm install
npm run dev      # abre http://localhost:5173
npm test         # pruebas de las fórmulas y de la simulación
npm run build    # versión para publicar, queda en dist/
```

## Dónde está cada cosa

| Archivo | Qué hace |
|---|---|
| `src/lib/colas.ts` | Fórmulas exactas de los cuatro modelos (sin interfaz) |
| `src/lib/simulacion.ts` | Simulación de eventos discretos que mueve la fila |
| `src/lib/pasos.ts` | El cálculo paso a paso en LaTeX |
| `src/modelos.ts` | Nombres, notación de Kendall y ejemplos de cada modelo |
| `src/paginas.ts` | Las seis secciones y la navegación con `#` en la dirección |
| `src/components/` | Interfaz: tarjetas de modelo, datos, guía ilustrada, resultados, gráficas, paso a paso |
| `src/components/sala3d/` | La sala en 3D (React Three Fiber) y el movimiento de las personas |

Hecho con React, Vite, TypeScript, Tailwind CSS, Motion, Three.js (React Three Fiber), Recharts y KaTeX.
