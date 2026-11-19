export function Encabezado() {
  return (
    <header className="grid gap-6 pb-8 pt-8 sm:pt-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div>
        <p className="font-cond text-lg font-semibold text-suave">Simulador de teoría de colas</p>
        <h1 className="mt-1 max-w-3xl font-cond text-5xl font-bold leading-[0.95] sm:text-7xl">
          ¿Cuánto se espera en tu fila?
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-suave">
          Primero elige el modelo que más se parece a tu fila: cada tarjeta muestra cómo funciona.
        </p>
      </div>
      <TicketPortada />
    </header>
  );
}

/** El ticket de turno que se toma al entrar: el símbolo de toda la página. */
function TicketPortada() {
  return (
    <div
      aria-hidden
      className="ticket hidden w-44 -rotate-3 flex-col items-center bg-senal px-5 pb-4 pt-3 text-sobresenal drop-shadow-[0_6px_8px_rgb(0_0_0/0.18)] lg:flex"
    >
      <span className="font-cond text-sm font-semibold">Su turno</span>
      <span className="font-cond text-6xl font-bold leading-none">001</span>
      <span className="mt-2 w-full border-t-2 border-dashed border-sobresenal/40 pt-2 text-center text-xs font-medium">
        Espere a ser llamado
      </span>
    </div>
  );
}
