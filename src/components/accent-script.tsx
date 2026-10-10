import { ACCENT_STORAGE_KEY, ACCENTS, accentVars } from "@/lib/theme/accents";

const MAP = Object.fromEntries(ACCENTS.map((a) => [a.id, accentVars(a.id)]));

/** Aplica el acento guardado antes del primer pintado (sin parpadeo). */
export function AccentScript() {
  const js = `try{var m=${JSON.stringify(MAP)},v=m[localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)})];if(v)for(var k in v)document.documentElement.style.setProperty(k,v[k])}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
