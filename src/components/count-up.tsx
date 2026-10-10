"use client";

import { useEffect, useRef } from "react";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

/**
 * Cuenta desde 0 hasta `value` al montarse (ease-out, 700 ms). El SSR ya trae
 * el valor final: sin JS o con movimiento reducido no hay animación.
 */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      el.textContent = usd.format(value * (1 - (1 - t) ** 3));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      el.textContent = usd.format(value);
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {usd.format(value)}
    </span>
  );
}
