"use client";

import { useReducer, useRef, type KeyboardEvent } from "react";
import { Calculator, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { initialCalculator, pressCalculatorKey, type CalculatorKey } from "./calculator";

const keypad: { key: CalculatorKey; label?: string; name?: string }[] = [
  { key: "clear", label: "C", name: "Limpiar" },
  { key: "sign", label: "±", name: "Cambiar signo" },
  { key: "delete", name: "Borrar dígito" },
  { key: "/", label: "÷", name: "Dividir" },
  { key: "7" }, { key: "8" }, { key: "9" },
  { key: "*", label: "×", name: "Multiplicar" },
  { key: "4" }, { key: "5" }, { key: "6" },
  { key: "-", label: "−", name: "Restar" },
  { key: "1" }, { key: "2" }, { key: "3" },
  { key: "+", name: "Sumar" },
  { key: "0" }, { key: ".", name: "Punto decimal" },
  { key: "=", name: "Calcular resultado" },
];

const keyboardKeys: Partial<Record<string, CalculatorKey>> = {
  "+": "+", "-": "-", "*": "*", "/": "/", "=": "=", ".": ".", ",": ".",
  Enter: "=", Backspace: "delete", Delete: "clear",
};

export function CalculatorWidget({ triggerClassName }: { triggerClassName: string }) {
  const [state, press] = useReducer(pressCalculatorKey, initialCalculator);
  const display = useRef<HTMLOutputElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
    if (event.key === "Enter" && event.target instanceof HTMLButtonElement) return;

    const key = /^[0-9]$/.test(event.key) ? event.key as `${number}` : keyboardKeys[event.key];
    if (!key) return;
    event.preventDefault();
    press(key);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" title="Calculadora" aria-label="Calculadora" className={triggerClassName}>
          <Calculator className="size-5" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
        collisionPadding={8}
        aria-label="Calculadora"
        className="max-h-(--radix-popover-content-available-height) w-64 max-w-(--radix-popover-content-available-width) overflow-y-auto p-3 print:hidden"
        onKeyDown={handleKeyDown}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          display.current?.focus();
        }}
      >
        <h2 className="font-semibold">Calculadora</h2>
        <output
          ref={display}
          tabIndex={-1}
          aria-label="Pantalla de la calculadora"
          className="bg-muted wrap-anywhere rounded-md px-3 py-2 text-right font-mono text-lg tabular-nums focus:outline-none"
        >
          {state.entry}
        </output>
        <div className="grid grid-cols-4 gap-1.5">
          {keypad.map(({ key, label, name }) => (
            <Button
              key={key}
              type="button"
              variant={key === "=" ? "default" : "outline"}
              aria-label={name}
              aria-pressed={key === state.operator ? state.replaceEntry : undefined}
              className={key === "0" ? "col-span-2 h-10" : "h-10 aria-pressed:bg-accent"}
              onClick={(event) => {
                press(key);
                if (event.detail > 0) display.current?.focus();
              }}
            >
              {key === "delete" ? <Delete aria-hidden /> : label ?? key}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
