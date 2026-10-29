import { ACCENT_STORAGE_KEY, ACCENTS, accentVars } from "@/lib/theme/accents";
import { HIDE_MONEY_KEY } from "@/lib/money-mask";

const MAP = Object.fromEntries(ACCENTS.map((a) => [a.id, accentVars(a.id)]));

/** Aplica el acento y el modo privado guardados antes del primer pintado (sin parpadeo). */
export function AccentScript() {
  const js = `try{var m=${JSON.stringify(MAP)},v=m[localStorage.getItem(${JSON.stringify(ACCENT_STORAGE_KEY)})];if(v)for(var k in v)document.documentElement.style.setProperty(k,v[k]);if(localStorage.getItem(${JSON.stringify(HIDE_MONEY_KEY)})==="1")document.documentElement.classList.add("hide-money")}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: js }} />;
}
