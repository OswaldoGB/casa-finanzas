# Fase 1 — Hogar, miembros y permisos

Especificación aprobada: `docs/SPEC.md`, decisiones acordadas y traspaso. El administrador asignará los permisos después: ausencia de permiso equivale a `none`.

## Diseño y estructura

- `supabase/migrations/20260927000002_permissions.sql`: enums `module_name` y `permission_level`, tabla `module_permissions`, función `has_module_access` y políticas RLS. Un hogar admite un administrador y un miembro. Bloquear cambios de rol/hogar desde el cliente y proteger el límite ante altas simultáneas.
- `src/features/permissions/{modules,queries}.ts`: listado de módulos, evaluación de acceso y comprobación de sesión/permisos en servidor.
- `src/features/settings/{schemas,queries,actions}.ts` y `components/`: configuración de hogar, creación de miembro por el administrador y matriz de permisos con guardado explícito.
- `src/app/(app)/settings/page.tsx`: hogar y miembros, disponible exclusivamente para el administrador.
- `src/app/(app)/access-pending/page.tsx`: estado informativo para miembros sin acceso a módulos disponibles.
- Layout, dashboard y navegación: ocultar módulos sin permiso, comprobar acceso antes de leer páginas y limitar botones a `edit`.

## Ejecución

- [x] Probar primero la jerarquía `none/view/edit`, el acceso universal del administrador, el bloqueo por defecto y la validación de formularios.
- [x] Implementar y aplicar la migración; generar tipos desde la base real.
- [x] Implementar consultas y acciones con autenticación, validación, verificación del hogar y compensación si falla el alta del perfil.
- [x] Crear la pantalla y adaptar navegación de escritorio/móvil, dashboard y estado sin acceso.
- [x] Probar RLS y restricciones contra Supabase usando usuarios temporales y eliminarlos después.
- [x] Verificar visualmente en escritorio y móvil, correr `npm run check` y build, revisar diff y guardar un commit Conventional Commits en español.

No se implementan aún catálogos ni tablas financieras: sus políticas usarán los permisos en la Fase 2. No avanzar de fase sin confirmación.
