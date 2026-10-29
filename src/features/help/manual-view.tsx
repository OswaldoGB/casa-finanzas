import { Fragment } from "react";
import type { Manual } from "./types";

/** **así** → <strong>; el resto es texto (sin HTML crudo). */
function Rich({ text }: { text: string }) {
  return (
    <>
      {text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
        i % 2 ? (
          <strong key={i} className="text-foreground font-semibold">
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

export function ManualView({ manual }: { manual: Manual }) {
  return (
    <article className="text-muted-foreground space-y-4 text-sm leading-relaxed">
      <header className="bg-accent/60 rounded-2xl border p-4">
        <p className="text-primary text-xs font-semibold tracking-wider uppercase">Manual</p>
        <h3 className="text-foreground mt-1 text-lg font-semibold">{manual.title}</h3>
        <p className="mt-1">
          <Rich text={manual.summary} />
        </p>
      </header>
      {manual.sections.map((s) => (
        <section key={s.title} className="bg-card rounded-2xl border p-4">
          <h4 className="text-primary mb-2 text-xs font-semibold tracking-wider uppercase">{s.title}</h4>
          {s.text && (
            <p>
              <Rich text={s.text} />
            </p>
          )}
          {s.steps && (
            <ol className="mt-2 list-decimal space-y-1.5 pl-5">
              {s.steps.map((x) => (
                <li key={x} className="pl-1">
                  <Rich text={x} />
                </li>
              ))}
            </ol>
          )}
          {s.tips && (
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {s.tips.map((x) => (
                <li key={x}>
                  <Rich text={x} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </article>
  );
}
