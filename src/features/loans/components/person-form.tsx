"use client";

import dynamic from "next/dynamic";
import { useId, useState } from "react";
import { useTheme } from "next-themes";
import { ActionForm } from "@/features/projects/components/action-form";
import { saveLoanPerson } from "../actions";
import type { LoanPerson } from "../schemas";

const defaultEmoji = "👤";
const defaultColor = "#6366f1";

const EmojiPicker = dynamic(async () => {
  const { default: Picker, EmojiStyle, Theme } = await import("emoji-picker-react");
  return function PersonEmojiPicker({ onPick, dark }: { onPick: (emoji: string) => void; dark: boolean }) {
    return (
      <Picker
        emojiStyle={EmojiStyle.NATIVE}
        theme={dark ? Theme.DARK : Theme.LIGHT}
        width="100%"
        height={320}
        autoFocusSearch={false}
        searchPlaceholder="Buscar emoji"
        previewConfig={{ showPreview: false }}
        onEmojiClick={({ emoji }) => onPick(emoji)}
      />
    );
  };
}, { ssr: false, loading: () => <p className="text-muted-foreground text-sm" role="status">Cargando emojis…</p> });

export function PersonAvatar({ emoji, color }: Pick<LoanPerson, "emoji" | "color">) {
  return (
    <span
      aria-hidden="true"
      className="inline-grid size-8 shrink-0 place-items-center rounded-full border text-base"
      style={{ backgroundColor: `${color}26`, borderColor: color }}
    >
      {emoji}
    </span>
  );
}

export function LoanPersonForm({ person }: { person?: LoanPerson }) {
  const id = useId();
  const { resolvedTheme } = useTheme();
  const [emoji, setEmoji] = useState(person?.emoji ?? defaultEmoji);
  const [color, setColor] = useState(person?.color ?? defaultColor);
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="mt-4 max-w-sm space-y-3">
      <ActionForm action={saveLoanPerson} label={person ? "Guardar apariencia" : "Guardar persona"} className="space-y-3">
        {person ? (
          <input type="hidden" name="id" value={person.id} />
        ) : (
          <label className="grid gap-1.5 text-sm">
            Nombre
            <input name="name" required maxLength={100} className="border-input bg-background rounded-lg border px-3 py-2.5" />
          </label>
        )}
        <input type="hidden" name="emoji" value={emoji} />
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5 text-sm">
            <span>Emoji</span>
            <button
              type="button"
              aria-expanded={showPicker}
              aria-controls={id}
              className="bg-background flex min-h-11 items-center gap-2 rounded-lg border px-2"
              onClick={() => setShowPicker((open) => !open)}
            >
              <PersonAvatar emoji={emoji} color={color} />
              {showPicker ? "Cerrar selector" : "Elegir emoji"}
            </button>
          </div>
          <label className="grid gap-1.5 text-sm">
            Color
            <input
              name="color"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="bg-background h-11 w-16 cursor-pointer rounded-lg border p-1"
            />
          </label>
        </div>
      </ActionForm>
      <div id={id} hidden={!showPicker}>
        {showPicker && <EmojiPicker dark={resolvedTheme === "dark"} onPick={(value) => {
          setEmoji(value);
          setShowPicker(false);
        }} />}
      </div>
    </div>
  );
}
