# Prompt para Claude Code — "Casa & Finanzas" (app personal del hogar)

> Copia todo lo que está debajo de la línea y pégalo en Claude Code dentro de una carpeta vacía.

---

## Rol y forma de trabajo

Eres un ingeniero full-stack senior con criterio de diseño de producto. Vas a construir conmigo una web app personal para administrar las finanzas y el inventario de mi hogar. La usaremos mi pareja y yo.

Reglas de trabajo, obligatorias:

1. **Antes de escribir código**, lee todo este documento y devuélveme un plan resumido con: estructura de carpetas, lista de migraciones SQL, lista de pantallas y cualquier duda o contradicción que detectes. Espera mi aprobación.
2. Trabaja **por fases** (ver sección "Fases"). Al terminar cada fase: corre lint, typecheck y tests, haz commit, y dame un resumen de lo hecho y cómo probarlo. **No avances a la siguiente fase sin mi confirmación.**
3. Si algo no está definido aquí, **pregúntame**; no asumas reglas de negocio.
4. **Commits:** usa Conventional Commits en español (`feat:`, `fix:`, `chore:`…). **No te pongas como autor ni co-autor**: no agregues `Co-Authored-By`, ni "Generated with Claude Code", ni ninguna firma o mención tuya en commits, PRs o código. El autor es únicamente mi configuración de git.
5. Nunca expongas secretos. La `SUPABASE_SERVICE_ROLE_KEY` solo se usa en el servidor.

## Contexto del producto

- Usuarios: **2** (yo = administrador, mi pareja = miembro). Registro público **cerrado**.
- Moneda única: **USD**. Formato con `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`.
- Interfaz en **español**.
- Web app **responsive**, pensada para usarse igual de bien en celular que en computadora.
- Hosting y base de datos **gratis** (Vercel Hobby + Supabase Free).

## Stack (no cambiar sin consultarme)

- **Next.js** (última estable, App Router, Server Components, Server Actions) + **TypeScript** estricto.
- **Supabase**: Postgres, Auth (email + contraseña), Storage (recibos), Row Level Security.
- `@supabase/ssr` para auth en servidor/cliente con middleware.
- **Tailwind CSS** + **shadcn/ui** + **lucide-react**.
- Gráficas: **shadcn/ui charts (Recharts)**.
- Formularios: **react-hook-form** + **zod** (validación compartida cliente/servidor).
- Tablas: **TanStack Table**.
- Fechas: **date-fns** (locale `es`).
- Tema claro/oscuro: **next-themes**.
- Notificaciones: **sonner**. Paleta de comandos: **cmdk** (vía shadcn `Command`).
- Exportación: **exceljs** (Excel) y CSV nativo.
- Tests: **Vitest** para lógica de dinero, proyecciones y permisos.
- Migraciones con **Supabase CLI** en `supabase/migrations/`. Tipos generados con `supabase gen types`.

## Diseño visual (muy importante)

Quiero que se sienta como una fintech moderna premium: minimalista, limpia y de buen gusto, pero con reportería y gráficas exquisitas.

- **Tema claro y oscuro** con switch (y opción "sistema"). Ambos deben verse igual de cuidados.
- Tipografía **Geist** (o Inter). Números con `tabular-nums`. Montos grandes con jerarquía clara (ej. `$1,234` grande y `.56` más tenue).
- Paleta neutra (grises cálidos/zinc) + **un color de acento** principal + colores semánticos: verde ingresos, rojo/coral gastos, azul transferencias, ámbar alertas. Cada categoría y cuenta tiene color e ícono propios.
- Gráficas con gradientes suaves, tooltips ricos, animaciones sutiles, leyendas legibles, sin ruido visual. Deben verse bien en móvil.
- Tarjetas con bordes sutiles, radios generosos, sombras mínimas, mucho espacio en blanco.
- **Navegación:** sidebar colapsable en escritorio; **bottom navigation** en móvil con botón central "+" para registro rápido.
- **Registro rápido** de un movimiento en menos de 5 segundos: monto primero (teclado numérico en móvil), luego categoría, cuenta y método de pago con valores recordados del último uso.
- Paleta de comandos `⌘K / Ctrl+K`: buscar movimientos, navegar, crear.
- Skeletons al cargar, estados vacíos ilustrados con llamada a la acción, confirmaciones al borrar, toasts con "deshacer" cuando aplique, actualizaciones optimistas.
- Accesibilidad: contraste AA, foco visible, navegación por teclado, `aria-label` en botones de ícono.
- Microinteracciones con `framer-motion` solo donde aporten (transiciones de páginas, contadores de montos).

## Autenticación, usuarios y permisos

- Login con **email + contraseña**. Recuperación de contraseña por email (flujo de Supabase).
- **Registro público deshabilitado.** Flujo de arranque:
  - Ruta `/setup` disponible **solo si no existe ningún perfil**: crea el primer usuario como **admin** y el hogar (`household`).
  - Después, el admin crea la cuenta de su pareja desde **Configuración → Miembros** (server action con service role, `auth.admin.createUser` o invitación por email).
  - Documenta que en Supabase se debe desactivar "Allow new users to sign up".
- **Permisos por módulo**, definidos por el admin, con tres niveles: `none` (no aparece en el menú ni puede acceder), `view` (solo lectura), `edit` (crear, editar, borrar).
- El admin siempre tiene `edit` en todo y es el único con acceso a Configuración.
- Los permisos se aplican en **tres capas**: RLS en Postgres (fuente de verdad), validación en server actions, y UI (ocultar menú y botones).
- Pantalla de permisos: matriz módulos × nivel, con toggles segmentados, clara y rápida de usar.

Módulos con permiso asignable: `dashboard`, `accounts`, `transactions`, `budgets`, `projections`, `reports`, `inventory`, `shopping`, `projects`, `loans`, `savings`.

## Modelo de datos (propuesta base; revísala y propón mejoras antes de implementar)

Todas las tablas de negocio llevan `household_id`, `created_by`, `created_at`, `updated_at`. Montos en `numeric(14,2)`, siempre positivos; el tipo define el signo. Fechas de movimiento como `date`.

- `households` — nombre, moneda (`USD`).
- `profiles` — `id` = `auth.users.id`, `household_id`, nombre, avatar, `role` (`admin` | `member`).
- `module_permissions` — `user_id`, `module` (enum), `level` (enum `none|view|edit`).
- `accounts` — nombre, tipo (`cash`, `checking`, `savings`, `credit_card`, `investment`, `other`), saldo inicial, color, ícono, archivada. Para tarjetas: límite de crédito, día de corte, día de pago.
- `payment_methods` — nombre, tipo (`cash`, `debit`, `credit`, `transfer`, `other`), cuenta vinculada opcional, archivado.
- `categories` — nombre, tipo (`income` | `expense`), `parent_id` (subcategorías), color, ícono, archivada. Seed con categorías por defecto en español, editables.
- `transactions` — tipo (`income`, `expense`, `transfer`, `loan_out`, `loan_repayment`, `goal_contribution`), monto, fecha, cuenta origen, cuenta destino (transferencias), categoría, método de pago, descripción, notas, `project_id` opcional, `loan_id` opcional, `savings_goal_id` opcional, `recurring_rule_id` opcional.
  - `loan_out` y `loan_repayment` afectan saldos de cuentas pero **no cuentan como gasto/ingreso** en reportes.
- `attachments` — `transaction_id`, ruta en Storage, tipo MIME, tamaño. Bucket privado por hogar. **Comprimir imágenes en el cliente** antes de subir (máx. ~1600px, WebP/JPEG) para cuidar el 1 GB gratis. Aceptar también PDF.
- `recurring_rules` — plantilla del movimiento + frecuencia (`weekly`, `biweekly`, `monthly`, `yearly`), intervalo, fecha inicio/fin, `next_run_date`, modo (`auto` se registra solo | `confirm` queda pendiente de confirmar).
- `budgets` — mes (`date` primer día), categoría, monto, arrastre de sobrante opcional.
- `inventory_items` — nombre, ubicación/habitación, categoría de inventario, cantidad, fecha de compra, precio, garantía hasta, estado, foto, notas, transacción vinculada opcional.
- `shopping_items` (compras próximas) — nombre, precio estimado, prioridad, fecha objetivo, enlace, estado (`pending`, `bought`, `discarded`). Al marcar como comprado: ofrecer crear el gasto y, opcionalmente, el ítem de inventario.
- `projects` — nombre, descripción, presupuesto, fechas, estado. Gasto real = suma de transacciones vinculadas.
- `loans` (solo dinero que yo presto) — deudor, monto prestado, fecha, fecha esperada de pago, notas, estado (`active`, `paid`, `written_off`). Saldo pendiente y **dinero recuperado** calculados con `loan_repayment`.
- `savings_goals` — nombre, tipo (`goal` para metas como viajes/carro | `provision` para apartados de gastos futuros conocidos como seguros, mantenimiento, impuestos), monto objetivo, fecha objetivo, cuenta vinculada opcional, color, ícono. Mostrar aporte mensual sugerido = faltante / meses restantes.
- `audit_log` (opcional, simple) — quién creó/editó/borró qué y cuándo.

Saldos y agregados mediante **vistas o funciones SQL** (saldo por cuenta, patrimonio neto, gasto por categoría/mes). Función `has_module_access(module, level)` con `security definer` usada por las políticas RLS. Índices en `household_id`, `date`, `category_id`, `account_id`.

## Funcionalidades por módulo

**Dashboard:** patrimonio neto, saldo por cuenta, ingresos vs gastos del mes, progreso de presupuestos, próximos pagos (tarjetas y recurrentes en los próximos 14 días), préstamos pendientes, avance de metas, mini flujo de caja proyectado.

**Cuentas y tarjetas:** CRUD, saldo actual, historial. Tarjetas: periodo de corte actual, saldo del estado de cuenta, fecha límite de pago, uso del límite (barra). Pagar tarjeta = transferencia desde otra cuenta.

**Movimientos:** lista con filtros (fecha, tipo, cuenta, categoría, método, usuario, proyecto, texto), agrupada por día con subtotales, edición inline, adjuntos visibles, selección múltiple para recategorizar/borrar. Pendientes de recurrentes con botón "confirmar".

**Configuración:** hogar, miembros, permisos, categorías (con subcategorías, color, ícono, arrastrar para ordenar), métodos de pago, recurrentes, exportación y respaldo.

**Presupuestos:** por mes y categoría, copiar del mes anterior, barra de progreso con colores por umbral (70% / 90% / 100%).

**Proyecciones:** flujo de caja a 3, 6 y 12 meses a partir de saldos actuales + recurrentes + pagos de tarjetas + presupuestos. Gráfica de área con línea de saldo proyectado y aviso si algún mes queda en negativo. Escenario "¿y si…?" simple (agregar gasto/ingreso hipotético sin guardarlo).

**Reportes:** gasto por categoría (dona + tabla), tendencia 12 meses (barras apiladas), ingresos vs gastos, evolución del patrimonio, por método de pago, por usuario, por proyecto. Selector de rango de fechas.

**Inventario:** vista de tarjetas con foto y vista de tabla, filtro por ubicación, alerta de garantías por vencer, valor total del inventario.

**Compras próximas:** lista priorizada tipo kanban o lista con drag, total estimado, conversión a gasto/inventario.

**Proyectos:** presupuesto vs real, lista de gastos vinculados, porcentaje ejecutado.

**Préstamos:** lista por deudor, registrar abonos parciales, total prestado, total recuperado, pendiente, préstamos vencidos resaltados.

**Ahorros y provisiones:** tarjetas con progreso circular, aportes y retiros, aporte mensual sugerido, fecha estimada de cumplimiento.

## Extras

- **Recurrentes:** Vercel Cron diario (compatible con plan Hobby) llama a una ruta protegida con `CRON_SECRET` que genera los movimientos del día. Además, al cargar la app, procesar pendientes atrasados por si el cron falló.
- **Exportar** cualquier tabla filtrada a CSV y Excel. **Respaldo completo** del hogar en JSON (y reporte mensual en Excel con hoja por módulo).
- **Búsqueda global** en la paleta de comandos.
- **Manifest PWA básico** (ícono, nombre, color de tema) para poder "agregar a inicio" en el celular, sin service worker complejo.
- Registro de quién creó cada movimiento (avatar pequeño en la lista).

## Calidad

- Estructura por features (`src/features/<modulo>/{components,actions,queries,schemas}`).
- Server Components para lectura; Server Actions para escritura con validación zod y chequeo de permisos.
- Lógica de dinero en funciones puras con tests (sumas, saldos, proyecciones, aporte sugerido, periodo de corte).
- Sin `any`. ESLint + Prettier. Manejo de errores con mensajes claros en español.
- Seed de desarrollo con datos realistas de varios meses para ver gráficas llenas.

## Fases

0. **Setup:** proyecto Next.js, Tailwind, shadcn, tema claro/oscuro, layout (sidebar + bottom nav), Supabase local/remoto, middleware de auth, `/login`, `/setup`, recuperación de contraseña.
1. **Hogar, miembros y permisos:** tablas base, RLS, `has_module_access`, pantalla de miembros y matriz de permisos.
2. **Núcleo financiero:** cuentas, tarjetas, métodos de pago, categorías, movimientos, adjuntos, registro rápido, recurrentes + cron.
3. **Dashboard y reportes.**
4. **Presupuestos y proyecciones.**
5. **Inventario, compras próximas y proyectos.**
6. **Préstamos, metas de ahorro y provisiones.**
7. **Exportación, respaldo, PWA, pulido visual, revisión de accesibilidad y rendimiento.**
8. **Deploy** y documentación final.

## Deploy (gratis y sencillo)

Genera un `README.md` en español con pasos exactos:

1. Crear proyecto en Supabase (Free). Copiar URL, anon key y service role key.
2. `supabase link` y `supabase db push` para aplicar migraciones. Crear bucket privado de recibos (vía migración).
3. En Supabase Auth: desactivar registro público, configurar Site URL y Redirect URLs con el dominio de Vercel.
4. Subir el repo a GitHub e importarlo en Vercel (Hobby). Variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
5. `vercel.json` con el cron diario.
6. Entrar a `/setup` para crear el admin.
7. Nota: Supabase Free pausa proyectos tras ~7 días sin actividad; el cron diario ayuda a mantenerlo activo. Explicar cómo reactivarlo si ocurre.
8. `.env.example` completo y sección de solución de problemas comunes.

Empieza leyendo todo y respondiendo con tu plan y tus preguntas.

---

## Decisiones acordadas (2026-09-27)

Estas decisiones resuelven las dudas del plan inicial y **tienen prioridad** sobre el texto de arriba.

1. **Supabase sin Docker:** dos proyectos Free en la nube (`dev` y `prod`). Supabase CLI se usa vía `npx supabase` (devDependency).
2. **Tipo `goal_withdrawal`** agregado a `transactions` para retiros de metas/provisiones.
3. **Aportes a metas:** si la meta tiene cuenta vinculada, el aporte es una transferencia hacia esa cuenta; si no, es un apartado virtual (no mueve saldo).
4. **Recurrentes `confirm`:** se generan como `transactions.status = 'pending'`; no afectan saldos ni reportes hasta confirmarse (`posted`).
5. **Tarjetas de crédito:** su saldo representa deuda (positivo = debo) y resta en el patrimonio neto.
6. **Préstamos `written_off`:** solo se cierran; no se registran como gasto.
7. **Patrimonio neto** = cuentas (activos − deudas de tarjetas) + préstamos pendientes por cobrar. El inventario se muestra aparte, no suma.
8. **Catálogos compartidos:** `accounts`, `categories` y `payment_methods` son legibles para quien tenga `view` en cualquier módulo que los use; editarlos requiere `edit` en `accounts` (cuentas) o ser admin (categorías y métodos, desde Configuración).
9. **Arrastre de presupuesto:** solo el sobrante pasa al mes siguiente.
10. **Zona horaria:** `households.timezone` (se detecta del navegador en `/setup`, editable). El cron y "hoy" se calculan en esa zona.
11. **`audit_log`:** fuera de alcance; `created_by` + `updated_at` cubren la trazabilidad.
12. **Gestor de paquetes:** npm.
13. **Next.js 16:** el middleware ahora es `src/proxy.ts`.

## Nuevo módulo: Listas de compra (`shopping_lists`)

Distinto de "Compras próximas" (`shopping`, que son deseos/compras grandes). Esto es la lista del súper o de cualquier tienda, pensada para usarse **en el pasillo, con el celular**.

**Objetivo:** saber cuánto voy a pagar **antes de llegar a caja**.

- `shopping_lists` — nombre, tienda (opcional), presupuesto tope (opcional), estado (`open`, `completed`, `archived`), `transaction_id` al cerrar.
- `shopping_list_items` — `list_id`, nombre, cantidad (`numeric(10,3)`, admite 1.5 kg), unidad opcional, precio estimado (opcional), precio real (opcional, se captura en la tienda), marcado en carrito (`checked`), orden, notas.

**Comportamiento:**
- Los artículos pueden crearse **con o sin precio**. El precio real se escribe al momento de ponerlo en el carrito (tap en el artículo → teclado numérico).
- Barra fija inferior con: **Total en carrito** (Σ precio real × cantidad de marcados), **Estimado restante** (Σ precio estimado de no marcados) y **Total proyectado**; si hay tope, barra de progreso y alerta ámbar/roja al acercarse o pasarse.
- Los artículos sin precio se cuentan aparte ("3 sin precio") para que el total no engañe.
- **Autocompletar** nombre y sugerir el **último precio pagado** del mismo artículo.
- **Duplicar lista** (ej. "Súper semanal") para reutilizarla.
- **Cerrar compra:** crea el gasto (`expense`) con el total del carrito, pidiendo cuenta, categoría y método (recordados del último uso); permite adjuntar el recibo. Los artículos no marcados pueden pasarse a una lista nueva.
- Uso compartido en tiempo real entre ambos usuarios (Supabase Realtime) para comprar juntos en la misma lista.
- Actualizaciones optimistas; la UI no debe bloquearse con mala señal en la tienda.
- Lógica de totales en funciones puras con tests.

Se implementa en la **Fase 5** junto a inventario, compras próximas y proyectos. Se agrega `shopping_lists` al enum de módulos con permiso asignable.
