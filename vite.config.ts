import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Rutas relativas: el build funciona en GitHub Pages (/simulador-colas/) y en cualquier carpeta.
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
});
