# Simulador de colas

Simulador animado de **teoría de colas** para los modelos **M/M/1, M/D/1, M/M/s y M/G/1**. Eliges el modelo que más se parece a tu fila, pones tus datos y la ves funcionar en una sala en 3D. Al lado tienes los resultados en palabras, las gráficas y cada fórmula calculada paso a paso con tus números.

**Pruébalo en línea:** https://wilrojasdev.github.io/simulador-colas/

Está pensado para estudiar o enseñar teoría de colas sin perderse en las fórmulas: cada pantalla muestra una sola idea, y lo demás queda a un clic.

## Recorrido

La página se recorre en seis pasos. Cada uno tiene su propia dirección (`#modelo`, `#datos`, …), así que el botón Atrás del navegador funciona y se puede compartir el enlace de un paso.

| Paso | Qué muestra |
|---|---|
| **1. Modelo** | Cuatro tarjetas, cada una con una fila en miniatura que corre de verdad, para ver en qué se diferencia cada modelo antes de elegir. |
| **2. Tus datos** | El formulario (λ, μ y, según el modelo, s o σ) junto a una guía ilustrada: al señalar un dato se ilumina dónde va en el dibujo (λ en la puerta, μ en el mostrador). |
| **3. Sala en vivo** | Una sala en 3D con personas que llegan, hacen fila y pasan al mostrador según tus datos. Se puede acelerar, pausar y girar, y comparar lo simulado contra la fórmula. |
| **4. Resultados** | Las tres respuestas que importan: cuánto se espera en la fila, cuántos hay esperando y qué tan ocupado está el servidor. El resto de las medidas (L, W, P₀ y más) queda en "Ver todas las medidas". |
| **5. Gráficas** | Una a la vez: qué pasa con la espera si llegan más clientes, la probabilidad de que haya n personas o el efecto de la variabilidad (M/D/1 y M/G/1). |
| **6. Paso a paso** | Cada fórmula del modelo con tus números, una por pantalla (con flechas del teclado), o todas juntas. |

Desde cualquier paso se pueden ajustar los datos sin perder de vista lo que se está mirando.

## Modelos

| Modelo | Qué supone | Ejemplo incluido | Cómo se calcula |
|---|---|---|---|
| **M/M/1** | Llegadas al azar (Poisson), atención exponencial, un servidor | Cajero de banco | Fórmulas cerradas y ley de Little |
| **M/D/1** | Llegadas al azar, atención de duración fija | Lavadero automático | Pollaczek-Khinchine con σ = 0 |
| **M/M/s** | Llegadas al azar, atención exponencial, s servidores con una sola fila | Call center | Erlang C |
| **M/G/1** | Llegadas al azar, atención con cualquier distribución (media 1/μ y desviación σ) | Taller mecánico | Pollaczek-Khinchine |

Si la ocupación ρ llega al 100 % o más, la página lo avisa: la fila crece sin límite y las fórmulas dejan de aplicar.

## Cómo funciona por dentro

- **Fórmulas exactas** (`src/lib/colas.ts`): calculan ρ, P₀, L, Lq, W y Wq para cada modelo. No dependen de la interfaz y tienen pruebas propias.
- **Simulación de eventos discretos** (`src/lib/simulacion.ts`): genera llegadas y atenciones al azar, y la interfaz la avanza con el reloj del navegador para animarla. En M/G/1 la duración de la atención sigue una distribución lognormal con la media y la desviación que pongas. La misma simulación mueve la sala en 3D y las miniaturas de las tarjetas.
- **Sala en 3D** (`src/components/sala3d/`): hecha con React Three Fiber. Las personas caminan por un recorrido fijo (entrada, fila, mostrador, salida) y su movimiento está probado sin dibujar nada: nadie termina de ser atendido antes de llegar al mostrador. La sala se descarga aparte, en segundo plano, para que la página abra rápido.
- **Animación** con Motion: las transiciones solo mueven posición y opacidad, y si el sistema tiene activado "reducir movimiento", la página lo respeta.

## Stack

| Para qué | Qué se usa |
|---|---|
| Interfaz | [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org) |
| Compilación y servidor de desarrollo | [Vite 8](https://vite.dev) |
| Estilos | [Tailwind CSS 4](https://tailwindcss.com) |
| Animación | [Motion](https://motion.dev) |
| 3D | [Three.js](https://threejs.org) con [React Three Fiber](https://r3f.docs.pmnd.rs) |
| Gráficas | [Recharts](https://recharts.org) |
| Fórmulas | [KaTeX](https://katex.org) |
| Íconos | [Lucide](https://lucide.dev) |
| Pruebas | [Vitest](https://vitest.dev) |
| Tipografías | Barlow, Barlow Condensed y Doto (Google Fonts) |
| Publicación | GitHub Pages con GitHub Actions |

## Cómo correrlo

Necesitas [Node.js](https://nodejs.org) 20.19 o más nuevo (o 22.12+).

```bash
git clone https://github.com/wilrojasdev/simulador-colas.git
cd simulador-colas
npm install
npm run dev
```

Se abre en http://localhost:5173.

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga al guardar |
| `npm test` | Corre las pruebas |
| `npm run build` | Revisa los tipos y genera la versión para publicar en `dist/` |
| `npm run preview` | Sirve la versión de `dist/` para revisarla antes de publicar |

## Pruebas

```bash
npm test
```

Hay tres grupos:

- **Fórmulas** (`src/lib/colas.test.ts`): ejemplos conocidos de cada modelo, que los modelos coincidan entre sí cuando deben (M/G/1 con σ = 0 es M/D/1, M/M/s con s = 1 es M/M/1), la ley de Little en todos y que los datos imposibles se rechacen.
- **Simulación** (`src/lib/simulacion.test.ts`): con suficiente tiempo, lo simulado se acerca a lo que dicen las fórmulas, y la atención lognormal de M/G/1 tiene la media y la desviación pedidas.
- **Movimiento en la sala** (`src/components/sala3d/movimiento.test.ts`): recorre la sala sin dibujarla en seis escenarios (uno o diez servidores, ocupación alta, varias velocidades) y revisa que todos lleguen al mostrador antes de que termine su atención y que nadie quede atascado.

## Estructura

```
src/
├── App.tsx                 # estado general y las seis secciones
├── paginas.ts              # secciones y navegación con # en la dirección
├── modelos.ts              # nombre, notación de Kendall y ejemplo de cada modelo
├── temas.ts                # colores de la página y de la sala en 3D
├── lib/
│   ├── colas.ts            # fórmulas exactas
│   ├── simulacion.ts       # simulación de eventos discretos
│   ├── pasos.ts            # el cálculo paso a paso en LaTeX
│   └── formato.ts          # números, porcentajes y duraciones legibles
└── components/
    ├── Modelo.tsx          # tarjetas animadas para elegir el modelo
    ├── MiniFila.tsx        # la fila en miniatura de cada tarjeta
    ├── Parametros.tsx      # formulario de datos
    ├── GuiaDatos.tsx       # guía ilustrada de cada dato
    ├── Escena.tsx          # sala en vivo: controles, tablero y comparación
    ├── Resultados.tsx      # respuestas principales y todas las medidas
    ├── Graficas.tsx        # gráficas, una a la vez
    ├── PasoAPaso.tsx       # fórmulas paso a paso
    ├── Navegacion.tsx      # menú de secciones, resumen de datos y panel para ajustarlos
    └── sala3d/             # la sala en 3D y el movimiento de las personas
```

## Publicación

Cada vez que se sube un cambio a `main`, GitHub Actions corre las pruebas, compila y publica en GitHub Pages (`.github/workflows/pages.yml`). La compilación usa rutas relativas, así que `dist/` funciona en cualquier carpeta de cualquier servidor estático.
