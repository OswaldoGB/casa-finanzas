"use client";

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <section
      className="mx-auto max-w-lg space-y-4 rounded-2xl border p-6"
      role="alert"
    >
      <h1 className="text-xl font-semibold">No pudimos cargar esta pantalla</h1>
      <p className="text-muted-foreground text-sm">
        Revisa tu conexión y vuelve a intentarlo. Si continúa, espera un momento
        antes de regresar.
      </p>
      <button
        type="button"
        onClick={retry}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm"
      >
        Volver a intentar
      </button>
    </section>
  );
}
