export default function Loading() {
  return (
    <div
      className="mx-auto max-w-5xl space-y-4"
      role="status"
      aria-live="polite"
    >
      <p className="text-muted-foreground text-sm">Cargando tu hogar…</p>
      <div
        className="bg-muted h-8 w-48 rounded-lg shimmer"
        aria-hidden
      />
      <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((key) => (
          <div
            key={key}
            className="bg-muted h-28 rounded-2xl shimmer"
          />
        ))}
      </div>
    </div>
  );
}
