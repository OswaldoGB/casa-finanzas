export default function Loading() {
  return (
    <div
      aria-label="Cargando recordatorios"
      className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-2"
    >
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-muted h-44 animate-pulse rounded-2xl motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
