"use client";

import { useRef, useState, type ComponentProps } from "react";
import { Calculator, Delete } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";
import { calculateMoney } from "@/lib/money-calculator";

export function MoneyInput({
  className,
  ref,
  wrapperClassName = "",
  ...props
}: ComponentProps<"input"> & { wrapperClassName?: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const expressionRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [expression, setExpression] = useState("");
  let result = "";
  let error = "";
  try {
    result = calculateMoney(expression);
    if (props.min != null && Number(result) < Number(props.min))
      error = `El monto debe ser al menos ${props.min}.`;
    if (props.max != null && Number(result) > Number(props.max))
      error = `El monto no puede superar ${props.max}.`;
  } catch (reason) {
    error = reason instanceof Error ? reason.message : "Revisa la operación.";
  }
  function apply() {
    const input = inputRef.current;
    if (!input || error || !result) return;
    // The native setter makes React's input event update controlled fields too.
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(input, result);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    setOpen(false);
  }
  function append(value: string) {
    const input = expressionRef.current;
    const start = input?.selectionStart ?? expression.length;
    const end = input?.selectionEnd ?? expression.length;
    const next =
      value === "backspace"
        ? expression.slice(0, start === end ? Math.max(0, start - 1) : start) +
          expression.slice(end)
        : expression.slice(0, start) + value + expression.slice(end);
    setExpression(next.slice(0, 200));
    requestAnimationFrame(() => {
      if (!window.matchMedia("(pointer: coarse)").matches) input?.focus();
      const cursor =
        value === "backspace"
          ? Math.max(0, start - (start === end ? 1 : 0))
          : start + value.length;
      input?.setSelectionRange(cursor, cursor);
    });
  }
  return (
    <span className={`relative block w-full min-w-0 ${wrapperClassName}`}>
      <input
        {...props}
        type="number"
        inputMode="decimal"
        step={props.step ?? "0.01"}
        onBlur={(event) => {
          if (open || event.relatedTarget === triggerRef.current) return;
          props.onBlur?.(event);
        }}
        className={`${className ?? "border-input bg-background h-11 w-full rounded-lg border px-3 text-sm"} appearance-textfield pr-12 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
        ref={(element) => {
          inputRef.current = element;
          if (typeof ref === "function") return ref(element);
          if (ref) ref.current = element;
        }}
      />
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) setExpression(inputRef.current?.value ?? "");
          setOpen(next);
        }}
      >
        <DialogTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            onPointerDown={(event) => event.preventDefault()}
            disabled={props.disabled || props.readOnly}
            aria-label="Abrir calculadora"
            title="Calcular monto"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 focus-visible:ring-ring absolute inset-y-0 right-1 my-auto flex size-9 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40"
          >
            <Calculator className="size-4" aria-hidden />
          </button>
        </DialogTrigger>
        <DialogContent
          className="max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 sm:max-w-sm"
          onOpenAutoFocus={(event) => {
            if (window.matchMedia("(pointer: coarse)").matches) {
              event.preventDefault();
              expressionRef.current?.setSelectionRange(
                0,
                expressionRef.current.value.length,
              );
              (
                expressionRef.current?.closest(
                  '[role="dialog"]',
                ) as HTMLElement | null
              )?.focus();
            }
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <DialogHeader>
            <DialogTitle>Calculadora</DialogTitle>
            <DialogDescription>
              Calcula el monto y úsalo en este campo.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 grid gap-2 rounded-xl border p-4">
            <input
              ref={expressionRef}
              value={expression}
              onChange={(event) => setExpression(event.target.value)}
              aria-label="Operación"
              autoComplete="off"
              maxLength={200}
              placeholder="Ej. 250 × 15%"
              className="focus-visible:ring-ring w-full min-w-0 rounded-md bg-transparent px-1 text-base outline-none focus-visible:ring-2"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  apply();
                }
              }}
            />
            <output
              aria-live="polite"
              className="text-primary min-h-9 text-right text-3xl font-semibold tabular-nums"
            >
              {result ? `$${result}` : "—"}
            </output>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              "C",
              "(",
              ")",
              "÷",
              "7",
              "8",
              "9",
              "×",
              "4",
              "5",
              "6",
              "−",
              "1",
              "2",
              "3",
              "+",
              "%",
              "0",
              ".",
              "backspace",
            ].map((key) => (
              <button
                key={key}
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                aria-label={
                  key === "backspace"
                    ? "Borrar último carácter"
                    : key === "C"
                      ? "Limpiar operación"
                      : key
                }
                onClick={() => (key === "C" ? setExpression("") : append(key))}
                className={`hover:bg-accent focus-visible:ring-ring h-12 rounded-xl border text-lg font-medium transition-colors focus-visible:ring-2 active:scale-95 motion-reduce:transform-none ${["÷", "×", "−", "+", "%"].includes(key) ? "text-primary bg-primary/5" : "bg-background"}`}
              >
                {key === "backspace" ? (
                  <Delete className="mx-auto size-5" aria-hidden />
                ) : (
                  key
                )}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-xs">
            15% equivale a 0.15. El resultado se redondea a dos decimales.
          </p>
          {expression && error && (
            <p role="status" className="text-destructive text-sm">
              {error}
            </p>
          )}
          <Button
            type="button"
            className="h-11 rounded-xl"
            disabled={Boolean(error) || !result}
            onClick={apply}
          >
            Usar resultado
          </Button>
        </DialogContent>
      </Dialog>
    </span>
  );
}
