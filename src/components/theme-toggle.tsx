"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ACCENTS, type AccentId } from "@/lib/theme/accents";
import { toCss } from "@/lib/theme/color";
import { useAccent } from "@/lib/theme/use-accent";
import { cn } from "@/lib/utils";

const GROUPS = [
  { id: "vivo", label: "Vivos" },
  { id: "sobrio", label: "Sobrios" },
] as const;

/** Menú de apariencia: modo claro/oscuro + color de acento. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { accent, setAccent } = useAccent();

  async function choose(id: AccentId) {
    const error = await setAccent(id);
    if (error) toast.error("Se aplicó en este dispositivo, pero no se pudo guardar en tu cuenta.");
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Apariencia: tema y color de acento">
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <p className="mb-2 text-sm font-medium">Tema</p>
        <ToggleGroup
          type="single"
          variant="outline"
          value={theme}
          onValueChange={(v) => v && setTheme(v)}
          className="mb-4 w-full"
          aria-label="Tema"
        >
          <ToggleGroupItem value="light" className="flex-1 gap-1.5">
            <Sun className="size-3.5" aria-hidden /> Claro
          </ToggleGroupItem>
          <ToggleGroupItem value="dark" className="flex-1 gap-1.5">
            <Moon className="size-3.5" aria-hidden /> Oscuro
          </ToggleGroupItem>
          <ToggleGroupItem value="system" className="flex-1 gap-1.5">
            <Monitor className="size-3.5" aria-hidden /> Auto
          </ToggleGroupItem>
        </ToggleGroup>

        {GROUPS.map((group) => (
          <fieldset key={group.id} className="mb-3 last:mb-0">
            <legend className="text-muted-foreground mb-2 text-xs font-medium">{group.label}</legend>
            <div role="radiogroup" aria-label={`Acentos ${group.label.toLowerCase()}`} className="grid grid-cols-6 gap-2">
              {ACCENTS.filter((a) => a.group === group.id).map((a) => {
                const selected = a.id === accent;
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={a.name}
                    title={a.name}
                    onClick={() => choose(a.id)}
                    style={
                      {
                        "--sw-l": toCss(a.tokens.light.primary),
                        "--sw-d": toCss(a.tokens.dark.primary),
                      } as React.CSSProperties
                    }
                    className={cn(
                      "grid aspect-square place-items-center rounded-full bg-(--sw-l) text-white shadow-xs ring-offset-2 ring-offset-(--popover) transition-transform duration-200 hover:scale-110 dark:bg-(--sw-d) dark:text-(--background)",
                      selected && "ring-foreground/70 scale-110 ring-2",
                    )}
                  >
                    {selected && <Check className="animate-in zoom-in-50 size-3.5 duration-200" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </PopoverContent>
    </Popover>
  );
}
