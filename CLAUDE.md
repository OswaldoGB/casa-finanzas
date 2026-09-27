@AGENTS.md

# Casa & Finanzas

Spec completa y decisiones: `docs/SPEC.md` (la sección "Decisiones acordadas" manda sobre el resto).

- Trabajo por fases; al cerrar cada una: `npm run check` (lint + typecheck + tests), commit, resumen. No avanzar sin confirmación del usuario.
- Commits: Conventional Commits en español. **Sin** `Co-Authored-By`, sin "Generated with Claude Code", sin firmas de Claude en commits, PRs ni código.
- UI en español; moneda USD; montos `numeric(14,2)` positivos, el tipo define el signo.
- `SUPABASE_SERVICE_ROLE_KEY` solo en servidor (`src/lib/supabase/admin.ts`, `import "server-only"`).
- Supabase CLI vía `npx supabase`; no hay Docker local.
