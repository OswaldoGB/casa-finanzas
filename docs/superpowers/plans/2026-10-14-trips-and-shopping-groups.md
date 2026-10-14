# Viajes y compras por lugar — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ejecución inline en esta sesión, conservando la preferencia del usuario.

**Goal:** Planificar viajes por día y pagar listas por tienda, compartiendo los movimientos existentes sin duplicar gastos.

**Architecture:** Extender las listas con lugares y compras independientes antes de introducir Viajes. Cada viaje es un proyecto con detalles y agenda propios; los movimientos del proyecto son la única fuente del gasto real. RPCs atómicas mantienen compras, estados y enlaces, con formularios cliente y datos compartidos en tiempo real.

**Tech Stack:** Next.js 16.3.6, React 19.2.8, TypeScript, Supabase/Postgres, Zod, Radix UI, Vitest y PGlite existentes. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-10-14-trips-and-shopping-groups-design.md`.

## Global Constraints

- Los precios incluyen impuestos.
- Cada gasto existe una sola vez en Movimientos.
- Mantener Presupuestos como control mensual por categoría.
- Usar los permisos de Proyectos para consultar y editar viajes.
- Las compras conservan los de Listas de compra y registrar gastos requiere Movimientos.
- Los importes se validan en servidor y se calculan en centavos; cantidades admiten tres decimales.
- Cambiar necesidades no altera compras ya registradas.
- No reabrir listas ni sumar nuevas obligaciones al migrar.
- No añadir mapas, reservas, deudas entre viajeros, recetas automáticas ni conversiones de unidades/monedas.
- Leer las guías relevantes de `node_modules/next/dist/docs/` antes de escribir componentes, acciones y rutas.
- Ejecutar scripts que crean datos únicamente contra un entorno de prueba confirmado; no usar producción para pruebas financieras.

## Review Focus

1. Una lista histórica cerrada con artículos no marcados no debe producir un nuevo gasto ni una obligación pendiente (tarea 1).
2. Una compra reenviada tras pérdida de conexión debe devolver el mismo movimiento, nunca cobrar dos veces (tarea 1).
3. Acortar las fechas del viaje no debe ocultar actividades fuera del nuevo rango (tarea 4).
4. Un precio desconocido, cero o corregido después de pagar debe distinguirse de ahorro y mostrar discrepancias (tareas 2 y 5).
5. Un usuario con acceso a viajes pero sin acceso a movimientos no debe obtener enlaces o acciones financieras inaccesibles (tarea 6).

## Estructura y contratos compartidos

Crear `src/features/trips/` con `schemas.ts`, `totals.ts`, `queries.ts`, `actions.ts`
y componentes por formulario/vista. Extender `src/features/shopping-lists/`;
extraer componentes de lugar y compra del carrito sin reescribir pantallas ajenas.

Tablas nuevas, todas con `id`, `household_id`, `created_by` y fechas de auditoría:

| Tabla | Datos propios y relaciones |
| --- | --- |
| `shopping_list_groups` | `list_id`, `name`, `sort_order`, `is_archived` |
| `shopping_list_purchases` | `list_id`, `group_id` nullable, `store_name` histórico, `transaction_id` único, `request_key` |
| `trip_details` | `project_id` único, `destination`, `participants` texto |
| `trip_activities` | `project_id`, `date`, `kind`, `time` nullable, `title`, `location`, `notes`, `sort_order` |
| `trip_cost_lines` | `project_id`, `activity_id` nullable, `name`, `quantity`, `unit`, `estimated_price` nullable, `category_id` nullable |
| `trip_cost_transactions` | `project_id`, `cost_line_id`, `transaction_id` único |
| `trip_activity_items` | `project_id`, `activity_id`, `item_id`, `required_quantity`, `unit` |

Columnas nuevas: `shopping_lists.project_id` nullable; `shopping_list_items.group_id`
y `purchase_id` nullable; `resolution` en artículos (`pending`, `available`,
`discarded`, `legacy_unbought`). Conservar `checked` para el carrito. Estado visible:
purchase_id → comprado; resolución disponible/descartado/histórico → su etiqueta;
pending + checked → en carrito; pending sin checked → pendiente.

Validar claves compuestas por hogar y pertenencia. Añadir unicidad necesaria a
artículos. `request_key` único por hogar; los reintentos deben coincidir con la
lista original. Un artículo solo puede pertenecer a una compra.

La sección «Por decidir» usa `group_id=null`, no una fila artificial. Archivar
un grupo conserva las compras; pendientes se pueden mover a otra sección.

Tipos de snapshot: derivar filas de `Database` actualizado y validar RPCs con Zod.
`TripSnapshot` contiene `project`, `detail`, `activities`, `costLines`,
`costTransactions`, `activityItems`, `lists`, `items`, `purchases`, `transactions`
y `canEdit`, `canEditLists`, `canEditTransactions`, `canViewTransactions`.

## Tarea 1: Compras independientes y migración compatible

**Files:** Create `supabase/migrations/20261014000043_shopping_groups_and_purchases.sql`,
`src/features/shopping-lists/purchases-database.test.ts`; modify
`src/lib/supabase/database.types.ts`. Usar `src/features/accounts/card-database.test.ts`
como referencia para PGlite, sin copiar fixtures irrelevantes.

**Interfaces:** `record_shopping_purchase(p_list_id uuid, p_group_id uuid nullable,
p_item_ids uuid[], p_account_id uuid, p_category_id uuid, p_date date,
p_payment_method_id uuid nullable, p_request_key uuid) → jsonb {purchase_id,
transaction_id}`. Validar permisos de listas/movimientos y proyecto cuando exista.
`set_shopping_item_resolution(p_item_id uuid,p_resolution text) → void` y
`reopen_shopping_list(p_list_id uuid) → void` para mutaciones que implican estados.

- [ ] Crear pruebas rojas de dos tiendas: pagar Selectos deja PriceSmart pendiente;
  el gasto y saldo reflejan únicamente Selectos. Repetir request_key devuelve los
  mismos IDs e importe; otro request_key con los mismos artículos se rechaza.
- [ ] Añadir pruebas de migración: lista cerrada con tx $10 y un artículo no
  marcado conserva tx $10, estado cerrado, una compra y el artículo histórico
  fuera del pendiente. Una lista abierta conserva su carrito y precios.
- [ ] Añadir pruebas de hogar/permisos, artículos ajenos al grupo, lista archivada,
  precio faltante, total cero, cantidades decimales y eliminación de una compra
  mientras queda otra pagada. Ejecutar `npx vitest run src/features/shopping-lists/purchases-database.test.ts`; esperar fallos por RPC/tablas ausentes.
- [ ] Crear tablas, índices, RLS y guardas; convertir tiendas de listas existentes
  en grupos, compras antiguas en historial y no marcados históricos en
  `legacy_unbought`. Ajustar guardas antes del backfill, conservando validaciones
  de hogar/permisos y la inmutabilidad financiera de artículos pagados.
- [ ] Implementar RPC con bloqueo de lista y artículos; incluir `project_id` del
  proyecto al insertar el gasto. Resolver reintento por request_key antes de
  validar estados ya pagados y comprobar que corresponde a la misma lista.
- [ ] Actualizar `delete_transaction_with_dependencies` y la ruta de borrado
  masivo para liberar solo artículos de esa compra, restaurarlos al carrito y
  reabrir su lista. Conservar las guardas de financiación existentes.
- [ ] Conservar firma/retorno de `close_shopping_list` como adaptador del RPC para
  el cliente anterior: pagar los marcados pendientes de un único grupo; rechazar
  varios grupos con mensaje de actualizar la app. No duplicar pendientes; devolver
  `new_list_id=null`. Mantener el vínculo legado para lectura, sin usarlo para
  registrar nuevos pagos. Actualizar duplicación para copiar grupos y estimados,
  limpiar estados/enlaces financieros y no heredar viaje sin elección explícita.
- [ ] Ejecutar prueba anterior en verde, regenerar tipos con el entorno de prueba
  confirmado y guardar un commit `feat: add shopping purchases by store`.

## Tarea 2: Estados y totales de compras

**Files:** Modify `src/features/shopping-lists/schemas.ts` y `schemas.test.ts`;
create `src/features/shopping-lists/purchase-totals.ts` y `purchase-totals.test.ts`.

**Interfaces:** `shoppingItemStatus(item) → 'pending'|'cart'|'purchased'|'available'|
'discarded'|'legacy_unbought'`; `shoppingPurchaseTotals(items,purchases,transactions)
→ {paid,cart,pending,projected,missingCart,missingPending}`. Exportar tipos de entradas.
`purchaseInputSchema` valida los argumentos del RPC; group/item schemas admiten
UUIDs opcionales y resoluciones permitidas.

- [ ] Escribir tests rojos: pagado $20, carrito 1.5 × $2.25 → $3.38, pendientes
  3 × $0.10 → $0.30, proyección $23.68. Excluir disponible y descartado.
  Dos compras apuntando al mismo tx no aumentan pagado. Un precio null aumenta
  contador de faltantes y cero no lo aumenta. Tx editado $21 prevalece sobre $20
  de desglose y produce discrepancia visible.
- [ ] Ejecutar `npx vitest run src/features/shopping-lists`; verificar fallos.
- [ ] Implementar estados y cálculos con redondeo igual al SQL de tarea 1,
  conservar el contrato actual `shoppingTotals` para consumidores que lo usen.
- [ ] Repetir tests en verde y commit `feat: calculate partial shopping totals`.

## Tarea 3: Listas agrupadas, pago y colaboración

**Files:** Modify `src/features/shopping-lists/{actions,queries}.ts`,
`components/{cart,forms}.tsx`, `src/app/(app)/lists/[id]/page.tsx`; create
`components/{group-section,group-form,purchase-dialog,purchase-history}.tsx`.

**Interfaces:** `getShoppingList(id)` agrega `groups`, `purchases`, `purchaseTransactions`
y datos de proyecto al contrato actual. Server Actions:
`saveGroup(_:FormState,form:FormData)`, `moveItem(_:FormState,form:FormData)`,
`resolveItem(_:FormState,form:FormData)`, `recordPurchase(_:FormState,form:FormData)`
y `reopenList(_:FormState,form:FormData) → Promise<FormState>`.
`group_id` nullable es parte de `saveItem`; el diálogo usa request_key estable
durante reintentos y genera otro cuando empieza una compra nueva.

- [ ] Añadir tests de schemas: cuenta/grupo/item inválidos se rechazan, fecha
  válida se acepta y no se permite mover o cambiar estado de un comprado.
  Ejecutar `npx vitest run src/features/shopping-lists` y comprobar fallos.
- [ ] Conectar las acciones a RPCs; guardar/mover grupos dentro de su hogar.
  Añadir consulta de proyectos permitidos para asociación; revalidar lista,
  viaje, cuentas, movimientos, presupuestos y dashboard tras pago.
- [ ] Mostrar secciones plegables, subtotales, carrito por tienda, selección de
  lugar y etiquetas «Ya lo tenemos»/«No comprar». Reusar Dialog, FormSelect,
  MoneyInput, ConfirmDialog y toast. Historial pagado inmutable con recibos.
- [ ] Pago por lugar con precio real, cuenta/tarjeta, categoría, fecha y método
  opcional. Pendientes siguen en la misma lista. Añadir reapertura y finalización
  derivada de artículos resueltos, incluyendo caso de lista vacía.
- [ ] Extender realtime a grupos/compras y cambios de lista; limpiar suscripciones.
  Mantener rollback de cambios optimistas y evitar actualizaciones/notificaciones dobles.
- [ ] Verificar en navegador de prueba crear dos lugares, mover artículo, pagar
  uno y continuar comprando; repetir visitas y reconectar. Dos sesiones no pueden
  pagar el mismo artículo. No crear datos financieros en producción.
- [ ] Ejecutar tests de tareas 1–2 y commit `feat: shop and pay by store`.

## Tarea 4: Datos y acciones de Viajes

**Files:** Create `supabase/migrations/20261014000044_trip_planning.sql`,
`src/features/trips/{schemas,queries,actions}.ts`, `schemas.test.ts`,
`trips-database.test.ts`; modify `src/lib/supabase/database.types.ts`.

**Interfaces:** `save_trip(p_project_id uuid nullable,p_name text,p_budget numeric,
p_start_date date,p_end_date date,p_status text,p_destination text,p_participants text,
p_description text) → uuid`; `trip_snapshot(p_project_id uuid) → TripSnapshot`;
`getTrips() → {trips,canEdit}`, `getTrip(id:string) → TripSnapshot|null`.
`saveActivity`, `saveCostLine`, `linkActivityItem`, `linkCostTransaction`, `saveTrip`
son acciones con firma `(_:FormState,form:FormData) → Promise<FormState>`.
Las operaciones compuestas de vínculos/presupuesto usan RPCs con validación de hogar.

- [ ] Tests rojos: crear viaje crea exactamente un proyecto; dos desayunos pueden
  vincular la misma línea de leche; asignar tx existente no crea otro ni modifica
  saldos. Un tx no se asigna a dos conceptos; una unidad diferente no se fusiona.
- [ ] Tests de fechas: rechazar fin antes de inicio, actividad fuera de fechas y
  reducción del rango que dejaría actividades fuera (mensaje para moverlas primero).
  Pagos fuera de fechas sí cuentan en gasto real. Probar permisos de Proyectos,
  Listas y Movimientos por operación y referencias de otro hogar.
- [ ] Ejecutar `npx vitest run src/features/trips` y confirmar fallos.
- [ ] Crear tablas/RLS/índices, RPCs y guardas. `save_trip` guarda proyecto y
  detalle atómicamente. Vínculos a productos usan líneas de listas del mismo viaje;
  productos compartidos no copian líneas ni suman gastos.
- [ ] Incorporar asociación de lista/proyecto y sincronización de movimientos
  mediante RPC, con confirmación de efectos y permiso de movimientos cuando ya
  tiene compras. Bloquear traslado silencioso de gastos asociados a otro viaje.
- [ ] Snapshot suma todos los gastos posted del proyecto, sin límite de 500;
  muestra los no asignados. Definir los schemas Zod de entradas y snapshot.
- [ ] Regenerar tipos, ejecutar tests en verde y commit `feat: add trip planning data`.

## Tarea 5: Agenda, presupuesto y compras del viaje

**Files:** Create `src/features/trips/{totals,totals.test}.ts`,
`components/{trip-dialog,trip-form,trip-overview,trip-days,activity-dialog,
activity-items,trip-budget,cost-line-dialog,trip-shopping,trip-workspace}.tsx`,
`src/app/(app)/trips/page.tsx` y `[id]/page.tsx`.

**Interfaces:** `tripTotals(snapshot:TripSnapshot) → {maximum,estimated,real,
pending,projected,margin,missingPrices}`. `TripWorkspace({snapshot:TripSnapshot})`
coordina las cuatro vistas y formularios; reutiliza carrito/acciones de tarea 3.

- [ ] Test rojo del Excel: estimado $529.59 y real $535.71 producen diferencia
  -$6.12. Tx de compra y su compra asociada cuentan una vez. Producto compartido
  entre dos menús cuenta una vez. Concepto sin precio permanece explícito.
  Anticipo $100 y resto $214 de Airbnb suman $314; si ya está pagado no queda
  nuevamente como $314 previsto. Actividad gratuita añade $0 sin tx.
- [ ] Ejecutar `npx vitest run src/features/trips/totals.test.ts` y confirmar fallos.
- [ ] Implementar cálculo y vista de líneas: estimado/real/diferencia solo para
  conceptos pagados comparables; no asignados visibles. Mantener concepto parcialmente
  pagado con pendiente `max(estimado-real,0)` y explicar que es una proyección.
  Si real supera estimado, no descontar deuda pendiente de otro concepto.
- [ ] Crear listado y formulario de viaje; cuatro vistas «Resumen», «Por día»,
  «Presupuesto», «Compras». Comidas/actividades por día con hora opcional; generales
  sin día. Selector de productos existentes o nuevos y aumento explícito de cantidad
  requerida; cantidad de compra separada para paquetes y cambios después de comprar.
- [ ] Modales y actualizaciones en vivo conservan errores y valores escritos;
  notas y títulos tienen límites, fechas usan zona del hogar sin conversiones UTC
  que cambien el día. Añadir mensajes y enlace al corregir una compra pagada.
- [ ] Verificar cuatro días del ejemplo, leche compartida, producto disponible,
  comidas gratuitas y anticipo/segundo pago. Tests verdes y commit `feat: build trip planner`.

## Tarea 6: Navegación, trazabilidad y exportaciones

**Files:** Modify `src/components/app-shell/{nav,mobile-create,mobile-create.test}.ts`,
`global-search.tsx`, `src/app/(app)/projects/{page,[id]/page}.tsx`,
`src/features/projects/{queries,schemas}.ts`, `src/features/transactions/{queries,details,details.test}.ts`,
`src/app/(app)/transactions/[id]/page.tsx`, `src/features/exports/{data,backup-tables}.ts`,
`src/features/exports/format.test.ts` y `README.md`.

**Interfaces:** `getMobileCreateAction('/trips...')` devuelve
`{href:'/trips?new=1',label:'Nuevo viaje',module:'projects'}`; una modal consume la
señal de URL al cerrar para que + funcione repetidamente. `getTransaction` agrega
`sources.shoppingPurchase` con viaje/lista/lugar/artículos y permisos de enlaces.
`exportRows('trips',params)` usa permiso projects y filtra por `trip` UUID opcional;
`exportRows('list_items',params)` añade lugar, estado, compra y viaje.

- [ ] Tests rojos de acción móvil, estado repetible, etiquetas de origen y filas
  exportadas; excluir acciones/links de movimientos para usuario sin ese permiso.
- [ ] Ejecutar `npx vitest run src/components/app-shell/mobile-create.test.ts src/features/transactions/details.test.ts src/features/exports/format.test.ts` y verificar fallos.
- [ ] Añadir Viajes al menú Hogar y búsqueda, usando permiso projects. Proyectos
  identifica viajes y dirige a `/trips/id`. Movimiento detalla la cascada de origen;
  recibos siguen adjuntos al movimiento original, sin copiar archivos.
- [ ] Ampliar CSV/Excel y backup con las siete tablas nuevas y columnas de relación;
  no mostrar columnas crudas como única explicación en UI. Actualizar README.
- [ ] Verificar permisos view/edit/none, + repetido, menú móvil, búsqueda y exportación
  sin enlaces inaccesibles. Tests verdes y commit `feat: connect trips across the app`.

## Tarea 7: Verificación integral y publicación

**Files:** Modify tests anteriores ante fallos reales; documentar validaciones
en este plan. No introducir scripts que necesiten datos reales.

- [ ] Ejecutar `npm run check`; esperar lint, typecheck y suite completa sin fallos.
- [ ] Ejecutar `npm run build`; esperar todas las rutas compiladas, incluido Viajes.
- [ ] Revisar invariantes SQL de tareas 1/4, compatibilidad de clientes anteriores,
  borrado masivo, idempotencia y cantidades/centavos. Verificar que el conjunto
  de migraciones se aplica a una base de prueba con datos históricos.
- [ ] Revisar UI a 360/390 px y escritorio: nav/+ completos, selects con teclado,
  calculadora en modales, textos largos sin desbordar y movimiento reducido.
- [ ] Revisar el flujo completo con dos sesiones de prueba: agenda → productos →
  dos tiendas → dos compras → recibos → presupuesto → borrar una compra.
  Confirmar saldos y mensualidad sin duplicados y reportes por proyecto coherentes.
- [ ] Auto-revisar diff completo, documentar limitaciones verificadas y corregir
  fallos dentro de alcance antes de declarar la entrega terminada.
- [ ] Con la autorización de despliegue vigente, inspeccionar proyecto Supabase
  enlazado y `db push --dry-run`; confirmar solo migraciones 43/44 revisadas.
  Aplicar cambios compatibles, verificar historial remoto y publicar en Vercel.
  Si hay otros cambios pendientes no revisados, detener esa publicación y explicarlos.
- [ ] Verificar despliegue READY y alias, acceso a rutas y componentes publicados
  sin guardar compras reales. Conservar datos y enlaces históricos.

## Revisión del plan

Las tareas 1–3 cubren listas por lugar, migración y pagos; 4–5 cubren viajes,
agenda y presupuesto; 6 cubre integración/exportación; 7 cubre verificación y
publicación. Los cinco riesgos de Review Focus tienen casos definidos arriba.
Ninguna tarea crea una segunda fuente financiera ni modifica datos históricos
para forzar coincidencias. No se ha iniciado implementación de producto.
