"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { NAV, SETTINGS_ITEM } from "./nav";
import { canAccess, type PermissionMap } from "@/features/permissions/modules";
import type { SearchResult } from "@/features/search/search";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

export function GlobalSearch({
  role,
  permissions,
}: {
  role: "admin" | "member";
  permissions: PermissionMap;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<{
    query: string;
    results: SearchResult[];
    error?: string;
  }>({ query: "", results: [] });
  const navigation = [
    ...NAV.flatMap((group) => group.items),
    SETTINGS_ITEM,
  ].filter((item) =>
    item.module === "settings"
      ? role === "admin"
      : canAccess(role, permissions, item.module, "view"),
  );
  const term = query.trim();
  const matchingNavigation = navigation.filter((item) =>
    item.label.toLocaleLowerCase("es").includes(term.toLocaleLowerCase("es")),
  );
  const loading = open && term.length >= 2 && search.query !== term;
  const results = search.query === term ? search.results : [];

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open || term.length < 2) return;
    const controller = new AbortController();
    const timeout = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(term)}`,
          { signal: controller.signal, cache: "no-store" },
        );
        if (!response.ok) throw new Error();
        const data: { results: SearchResult[] } = await response.json();
        if (!controller.signal.aborted)
          setSearch({ query: term, results: data.results });
      } catch {
        if (!controller.signal.aborted)
          setSearch({
            query: term,
            results: [],
            error: "No se pudo buscar. Cambia el texto para intentar de nuevo.",
          });
      }
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [open, term]);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="ml-auto"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Search aria-hidden className="size-4" /> Buscar{" "}
        <kbd className="text-muted-foreground ml-3 hidden text-xs md:inline">
          Ctrl / ⌘ K
        </kbd>
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="top-[15%] translate-y-0 gap-0 p-1 sm:max-w-lg"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">
            Buscar en Casa & Finanzas
          </DialogTitle>
          <DialogDescription className="sr-only">
            Busca páginas y registros disponibles. Usa las flechas para elegir y
            Enter para abrir.
          </DialogDescription>
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar páginas, cuentas, movimientos…"
              aria-label="Buscar páginas y registros"
              maxLength={80}
            />
            <CommandList>
              {matchingNavigation.length > 0 && (
                <CommandGroup heading="Ir a">
                  {matchingNavigation.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={item.href}
                      onSelect={() => navigate(item.href)}
                    >
                      <item.icon aria-hidden />
                      {item.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {!term && (
                <CommandGroup heading="Crear">
                  {canAccess(role, permissions, "transactions", "edit") && (
                    <CommandItem
                      value="new-transaction"
                      onSelect={() => navigate("/transactions/new")}
                    >
                      Registrar movimiento
                    </CommandItem>
                  )}
                  {canAccess(role, permissions, "shopping_lists", "edit") && (
                    <CommandItem
                      value="new-list"
                      onSelect={() => navigate("/lists/new")}
                    >
                      Crear lista de compra
                    </CommandItem>
                  )}
                </CommandGroup>
              )}
              {results.length > 0 && (
                <CommandGroup heading="Registros">
                  {results.map((result) => (
                    <CommandItem
                      key={result.id}
                      value={result.id}
                      onSelect={() => navigate(result.href)}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {result.title}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {result.label}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <p
                className="text-muted-foreground px-3 py-3 text-sm"
                role="status"
                aria-live="polite"
              >
                {loading
                  ? "Buscando…"
                  : search.query === term && search.error
                    ? search.error
                    : term.length === 1
                      ? "Escribe al menos dos caracteres para buscar registros."
                      : term.length >= 2 &&
                          !results.length &&
                          !matchingNavigation.length
                        ? "No se encontraron resultados."
                        : ""}
              </p>
            </CommandList>
          </Command>
          <button
            type="button"
            className="text-muted-foreground rounded-lg px-3 py-2 text-right text-xs hover:underline"
            onClick={() => setOpen(false)}
          >
            Cerrar · Esc
          </button>
        </DialogContent>
      </Dialog>
    </>
  );
}
