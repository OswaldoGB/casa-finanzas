import { splitUSD } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Money({ value, className }: { value: number; className?: string }) {
  const { whole, cents } = splitUSD(value);
  return (
    <span className={cn("tabular-nums", className)}>
      {whole}
      <span className="text-muted-foreground/70 text-[0.7em]">{cents}</span>
    </span>
  );
}
