# Recordatorios y notificaciones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Ejecución inline, conservando la preferencia vigente del usuario; revisión independiente del conjunto al finalizar.

**Goal:** Registrar notas y realizaciones, preparar próximos recordatorios y avisar dentro de la app y mediante Web Push, respetando privacidad, historial y permisos.

**Architecture:** Recordatorios es un módulo propio de Supabase con RLS y RPCs atómicas para realizaciones, recurrencia e invalidación de avisos. Una bandeja personal y una cola persistida comparten identidad de aviso; un cron diario independiente prepara y envía Web Push mediante Service Worker. La UI reutiliza los componentes actuales de Next/React y las fechas del hogar.

**Tech Stack:** Next.js 16.3.6, React 19.2.8, TypeScript, Supabase/Postgres, Zod, Radix, Lucide, react-day-picker, Vitest y PGlite existentes. Única dependencia nueva prevista: `web-push` y sus tipos, para cifrado y transporte estándar VAPID.

**Spec:** `docs/superpowers/specs/2026-10-17-reminders-and-notifications-design.md`, aprobada por el usuario con «Vamos!».

## Global Constraints

- Título 120 caracteres, referencia 80 y notas 5.000; texto plano.
- Tipos Nota, Puntual y Recurrente; campos condicionales según el tipo.
- Categorías iniciales: Vehículos, Mascotas, Salud, Estudios, Hogar y Personal.
- Privacidad personal por defecto; ser administrador no permite leer notas personales ajenas.
- Permiso nuevo `reminders` con none/view/edit; sin asignación un miembro no obtiene acceso.
- Las fechas serán días de calendario en la zona horaria del hogar.
- Repetición cada N días/semanas/meses/años; desde realización o calendario fijo.
- Una sola ocasión pendiente por serie, sin fabricar realizaciones de periodos omitidos.
- Kilometraje manual no negativo, máximo un decimal; fecha o kilómetros bastan para vencer.
- Avisos por defecto 7, 1 y 0 días antes; valores distintos entre 0 y 365.
- Cron separado a las 12:00 UTC; no se promete precisión al minuto.
- Push genérico, sin títulos privados, notas o referencias sensibles en pantalla bloqueada.
- Completar, posponer, pausar, archivar o cambiar privacidad invalida envíos pendientes obsoletos.
- La UI no tendrá borrado físico de recordatorios; archivar es reversible.
- No modificar registros financieros ni cachear páginas autenticadas en el Service Worker.
- No incluir endpoints, claves, suscripciones ni cola en respaldos generales.
- Leer las guías relevantes instaladas en `node_modules/next/dist/docs/` antes de escribir código.
- No crear datos de prueba ni enviar notificaciones a personas reales sin su acción explícita.

## Review Focus

1. Dos sesiones completan la misma ocasión y reintentan tras perder conexión: una realización y un avance (tarea 2).
2. Un administrador consulta, busca o exporta una nota personal ajena: no recibe contenido ni contadores reveladores (tareas 2, 4 y 7).
3. Posponer o revocar acceso entre reclamar la cola y enviar: el envío obsoleto se cancela; no se promete retirar un mensaje ya entregado (tareas 4 y 6).
4. Calendario fijo en 31 de enero, 29 de febrero o realización antigua: se conserva el ancla y no se fabrican cumplimientos (tarea 1).
5. Cerrar sesión y entrar con otra cuenta en el mismo teléfono: la nueva cuenta no hereda avisos ni puede apropiarse del endpoint (tarea 5).

---

## Mapa de archivos y contratos

`src/features/reminders/` contendrá `schemas.ts`, `schedule.ts`, `status.ts`,
`queries.ts`, `actions.ts`, componentes de agenda/calendario/formulario/historial y
pruebas. `src/features/notifications/` contendrá bandeja, preferencias, registro de
dispositivos, preparación de avisos y transporte. La identidad financiera existente
permanece independiente.

Los contratos TypeScript compartidos serán `ReminderSchedule`, `CompletionInput`,
`NextOccurrence`, `ReminderRecord`, `ReminderEvent`, `ReminderFilters`,
`NotificationCondition`, `PushSubscriptionInput` y `DeliveryClaim`; se definen en
los archivos indicados por las tareas, sin duplicarlos entre consumidores.

SQL devolverá JSON de forma explícita para los snapshots. La aplicación validará
sus límites con Zod y la base los comprobará de nuevo mediante checks/guards/RPC.
Se podrán usar contratos locales acotados durante el desarrollo, retirándolos al
regenerar `src/lib/supabase/database.generated.ts` en la publicación. Conservar las
correcciones de argumentos nullable de `database.types.ts`.

### Tarea 1: Programación, estados y validación de entradas

**Files:** Create `src/features/reminders/{schemas,schedule,status}.ts` y sus
`{schemas,schedule,status}.test.ts`. Leer `src/features/finance/recurrence.ts` y
`src/features/recurring/processing.ts`; reutilizar sin cambiar contratos financieros.

**Interfaces:** `ReminderSchedule` incluye `dueDate`, `dueTime`, `anchorDate`,
`repeatUnit:'day'|'week'|'month'|'year'|null`, `repeatInterval`,
`repeatFrom:'completion'|'calendar'`, `dueKm`, `currentKm`, `repeatKm`,
`snoozedUntil` y `status`. `CompletionInput` contiene `performedDate`, `performedKm`
y `today`. `nextOccurrence(schedule,input):NextOccurrence` devuelve fechas/objetivo,
ancla y `skippedCount`. `reminderStatus(record,today):'note'|'overdue'|'today'|
'upcoming'|'mileage_unknown'|'completed'|'paused'|'archived'` clasifica por día;
la hora se muestra y ordena, sin convertir el cron en alarma al minuto.

- [ ] Escribir pruebas rojas de esquemas: título de 121 rechazado, notas de 5.001
  rechazadas, avisos `[7,1,0]` válidos, duplicados normalizados, 366 rechazado,
  kilómetros con dos decimales rechazados. Recurrencia sin regla y puntual sin
  fecha ni objetivo son inválidos; nota no retiene programación oculta.
- [ ] Escribir pruebas de calendario: 31/ene → 28/feb → 31/mar; 29/feb/2028 →
  28/feb/2029; calendario semanal vencido salta hasta después de hoy y cuenta
  omisiones; desde realización antigua conserva la próxima fecha vencida.
- [ ] Fijar con assertions `performedKm:120000, repeatKm:5000 → dueKm:125000`;
  fecha futura con objetivo ya alcanzado es overdue; sin lectura es mileage_unknown
  solo si la fecha no determina ya un vencimiento. Nota sin fecha es note.
- [ ] Ejecutar `npx vitest run src/features/reminders`; confirmar fallos por módulos
  ausentes antes de implementar.
- [ ] Implementar funciones puras, normalización decimal a décimas y esquemas con
  límites compartidos; no inferir intervalos de salud/mantenimiento.
- [ ] Ejecutar las mismas pruebas y `npx tsc --noEmit`; esperar verde. Commit
  `feat: define reminder schedules and validation`.

### Tarea 2: Datos, privacidad e historial atómico

**Files:** Create migrations `20261017000045_reminders_module.sql` y
`20261017000046_reminders.sql`, `src/features/reminders/{database-test-fixture,
reminders-database.test}.ts`. Modify `src/features/permissions/modules.ts`,
`modules.test.ts` y contratos locales/tipos Supabase solo donde sean necesarios.

**Interfaces:** Añadir enum `reminders` en 45 y usarlo en 46. Crear tablas
`reminder_categories`, `reminders`, `reminder_events`. Recordatorios mantienen
`owner_id`, `visibility`, `kind`, título/notas/referencia, categoría, programación,
`occurrence_id uuid`, `schedule_revision int`, estado y auditoría. Categorías del
hogar con clave estable y semilla idempotente para hogares actuales y nuevos.
Historial guarda instantáneas y tipo de evento (realización, omisión, posposición,
pausa, archivo y corrección de lectura), sin reescribir eventos anteriores.

RPCs autenticadas: `save_reminder(p_input jsonb,p_request_key uuid) returns jsonb`,
`complete_reminder(p_id uuid,p_occurrence_id uuid,p_input jsonb,p_request_key uuid)
returns jsonb`, `reminder_operation(p_id uuid,p_operation text,p_input jsonb)
returns jsonb` y `reminder_snapshot(p_id uuid) returns jsonb`.
Categorías se editan por acciones RLS; no hay delete autenticado de historial.

- [ ] Crear fixture PGlite con perfiles admin/miembro/otro hogar y permisos reales.
  Ejecutar migraciones de prueba con rol authenticated, no solo como propietario.
- [ ] Pruebas rojas: admin no lee snapshot ni eventos personales ajenos; miembro view
  lee compartidos pero no escribe; none no lee nada; owner no puede mover hogar ni
  cambiar identidad; solo propietario cambia privacidad; categorías de otro hogar
  se rechazan. Usuarios edit modifican compartidos.
- [ ] Pruebas rojas: completar/reintentar con misma clave y ocasión crea exactamente
  un evento, devuelve mismo resultado y nunca completa la siguiente ocasión.
  Ya lo realicé crea historial y siguiente ocasión en una transacción. Verificar
  SQL contra los casos de calendario y kilómetros de tarea 1.
- [ ] Ejecutar `npx vitest run src/features/reminders/reminders-database.test.ts`
  y confirmar fallos por tablas/funciones ausentes.
- [ ] Implementar checks, claves compuestas al hogar, índices por dueño/visibilidad/
  fecha/estado/referencia, RLS, guards privilegiados con search_path fijo y RPCs con
  bloqueos. Incrementar revisión solo al cambiar programación, avisos, estado o
  privacidad; una edición de notas no genera nueva ronda de avisos.
- [ ] Verificar que los resultados incluyen datos explícitos, que la privacidad no
  depende del cliente y que no se alteran movimientos. Tests verdes y commit
  `feat: add private reminder records and atomic history`.

### Tarea 3: Agenda, calendario y formularios de recordatorios

**Files:** Create `src/app/(app)/reminders/{page,loading}.tsx`, `[id]/page.tsx`,
`src/features/reminders/{queries,actions}.ts` y `components/{reminder-dialog,
reminder-form,reminder-card,reminder-agenda,reminder-calendar,reminder-history,
completion-dialog,snooze-dialog,category-dialog,reminder-filters}.tsx`.

**Interfaces:** `getReminders(filters:ReminderFilters)` devuelve filas paginadas,
categorías y capacidades; `getReminder(id)` usa snapshot; `saveReminder`,
`completeReminder`, `operateReminder`, `saveReminderCategory` son acciones con
`FormState`. La búsqueda/calendario no leerán toda la tabla. Completar consume
`occurrence_id` visto al abrir el modal; claves de petición estables por intento.

- [ ] Pruebas rojas de filtros y schemas: rangos de calendario acotados, página
  válida, referencias largas rechazadas, programación oculta eliminada al pasar
  a nota y confirmación requerida al reducir una lectura de kilómetros.
- [ ] Ejecutar pruebas y confirmar fallos; implementar consultas con orden estable
  e índices compatibles. Permiso se comprueba antes de cada acción.
- [ ] Crear agenda Vencidos/Hoy/Próximos y vistas Notas/Realizados. Calendario con
  react-day-picker existente; filtrar día/rango, categoría, referencia, tipo,
  privacidad y estado mediante URL con valores validados.
- [ ] Crear modales con campos condicionales, vista previa de próxima ocasión,
  opción Ya lo realicé, mensajes accesibles y confirmación de correcciones. Reusar
  Dialog, FormSelect, ConfirmDialog y estilos existentes; no acoplar el nuevo módulo
  a acciones de Viajes. El historial muestra omisiones sin presentarlas como realizadas.
- [ ] Actualizar mediante refresh/realtime respetando RLS; suscripciones eliminadas
  al desmontar. Conservar texto y selects tras error; un toast por éxito.
- [ ] Revisar con fixture local: nota, parcial, pickup, dos perros, texto largo,
  fecha/objetivo combinado y controles view/edit. Verde y commit
  `feat: build reminders agenda calendar and history`.

### Tarea 4: Bandeja, elegibilidad y cola de notificaciones

**Files:** Create migration `20261017000047_reminder_notifications.sql`,
`src/features/notifications/{schemas,conditions,queries,actions}.ts`,
`{conditions,notifications-database}.test.ts`, `components/{notification-bell,
notification-list,notification-preferences}.tsx`, `src/app/(app)/notifications/page.tsx`.

**Interfaces:** Crear las otras cuatro tablas: `reminder_preferences`,
`user_notifications`, `push_subscriptions`, `notification_deliveries`.
`notificationCondition(record,today):NotificationCondition|null` elige el aviso
actual más cercano (7/1/0 días o kilometraje alcanzado), con catch-up único.
`prepare_reminder_notifications(p_now timestamptz) returns jsonb` es solo servidor;
`refresh_my_reminder_notifications() returns jsonb` usa identidad y hogar autenticados.
`claim_notification_deliveries(p_limit int,p_now timestamptz) returns jsonb` devuelve
`DeliveryClaim[]` y solo es invocable por service role. Lease inicial 5 minutos.

- [ ] Pruebas rojas: fechas 7/1/0, creación tardía, cron ausente y vencido antiguo
  crean solo condición relevante, no ráfaga ni un nuevo aviso cada día.
- [ ] Probar dos preparaciones/reclamaciones concurrentes, fallo y expiración de
  lease; unicidad de aviso por recordatorio/revisión/destinatario/condición y entrega
  por aviso/dispositivo. Completar o posponer invalida pendientes anteriores.
- [ ] Probar admin sin acceso a nota personal, preferencias de compartidos,
  revocación de permiso y cambio hogar→personal: bandeja/contador/push no revelan
  origen. La comprobación de elegibilidad no se limita a referencias ocultas por RLS.
- [ ] Ejecutar los tests rojos; implementar SQL/RLS y funciones. Limitar privilegios
  del claim a servidor, no otorgar escritura arbitraria sobre destinatarios/colas.
  Triggers cancelan pendientes al cambiar revisión o permisos.
- [ ] Implementar bandeja paginada personal, contador, lectura individual/todas y
  preferencias. Preparación al entrar por acción autenticada; no mutar durante render.
  Leer aviso no completa tarea; enlace sin acceso muestra explicación sin contenido.
- [ ] Probar SQL con roles y funciones puras en verde. Commit
  `feat: add personal notification inbox and durable delivery queue`.

### Tarea 5: Dispositivos, Service Worker y Web Push

**Files:** Create `public/sw.js`, `src/features/notifications/{push-subscriptions,
push-validation,push-transport}.ts`, `push-validation.test.ts`, `push-subscriptions.test.ts`,
`components/push-device-settings.tsx`, `src/app/api/notifications/subscription/route.ts`
y `test-push/route.ts`. Modify `package.json`, lockfile, `.env.example`, `src/proxy.ts`,
`src/proxy.test.ts`, `src/features/auth/actions.ts`, `src/components/app-shell/app-sidebar.tsx`
y añadir `src/features/notifications/components/sign-out-button.tsx`.

**Interfaces:** `PushSubscriptionInput` valida endpoint, p256dh y auth.
`validatePushEndpoint(value:string):URL` valida HTTPS/443/sin credenciales y hosts
conocidos de Apple/FCM/Mozilla/WNS verificados en documentación primaria al implementar.
`sendPush(subscription,payload)` usa web-push y VAPID. `registerDevice`,
`revokeDevice` y `sendTestPush` derivan identidad de sesión; cookie aleatoria HttpOnly
de dispositivo enlaza la revocación en signOut con la suscripción actual.
`NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT` son
las variables; clave privada jamás se importa en componentes cliente.

- [ ] Pruebas rojas de destinos: rechazar http, localhost, IPs públicas/privadas
  arbitrarias, credenciales, puertos no 443 y nombres que solo contienen el dominio
  permitido como prefijo. Aceptar endpoints reales de proveedores sin acceder a red.
- [ ] Probar origen externo y falta de sesión rechazados, claves inválidas,
  suscripción ya ajena no transferible, revocación limitada al dispositivo propio y
  cambio de cuenta sin heredar avisos. Endpoint/hash único, token de dispositivo
  no basta para apropiarse de una suscripción de otra identidad.
- [ ] Ejecutar tests y confirmar rojo; instalar web-push/tipos del registro oficial.
  Implementar registro/revocación, límites y token seguro; no registrar endpoints
  completos ni secretos en logs. Prueba push solo tras acción explícita y con límite
  de una solicitud por minuto por usuario, persistido en preferencias.
- [ ] Implementar activación contextual, estados permitido/denegado/no compatible,
  instrucciones iOS y desactivación. Service Worker público a raíz, sin caché offline;
  push muestra texto genérico y tag estable; click valida URL interna y enfoca/abre
  una ventana con autenticación. No confiar en enlaces externos del payload.
- [ ] Logout intenta desvincular cookie/suscripción antes de signOut; fallo visible
  permite reintentar revocación. Si la sesión ya expiró, no reasignar el endpoint
  a otra identidad automáticamente: exigir nueva suscripción del navegador.
- [ ] Tests verdes, comprobar imports cliente/servidor y que /sw.js no redirige a
  login. Commit `feat: enable per-device web push notifications`.

### Tarea 6: Procesamiento diario y entrega tolerante a fallos

**Files:** Create `src/features/notifications/{process-due,delivery}.ts`,
`{process-due,delivery}.test.ts`, `src/app/api/cron/reminders/route.ts` y
`route.test.ts`. Modify `vercel.json` sin cambiar el cron financiero.

**Interfaces:** `processDueNotifications(now:Date):Promise<DeliverySummary>` prepara
avisos y procesa lotes de 50; presupuesto máximo interno 40 segundos con timeout
de red por envío de 10 segundos y concurrencia máxima 5. `deliverClaim(claim,now)`
vuelve a comprobar elegibilidad, revisión y dispositivo mediante RPC antes del envío.
Cron `0 12 * * *`, `runtime=nodejs`, `maxDuration=60`, secreto obligatorio.

- [ ] Pruebas rojas con transporte falso: completar, posponer o revocar acceso tras
  reclamar cancela la entrega; caída del transporte reintenta, 404/410 desactiva solo
  esa suscripción, error de una persona no impide entregar a otras.
- [ ] Probar doble cron, lease vencido y proveedor que acepta seguido de fallo local;
  conservar tag estable y documentar entrega al menos una vez, no prometer exactamente
  una. No marcar enviada antes de que el proveedor acepte.
- [ ] Probar 401 sin secreto o con secreto incorrecto, sin producir trabajo; la
  respuesta autorizada solo devuelve contadores, sin contenido privado.
- [ ] Ejecutar rojo; implementar consulta paginada/claims, revalidación, procesamiento
  acotado y resultados persistidos. Hasta 5 intentos por entrega con siguiente intento
  diario; revisión invalidada no se reintenta. No recuperar todos los avisos atrasados.
- [ ] Ejecutar en verde con reloj fijo y transporte falso, sin red real. Commit
  `feat: process scheduled reminder notifications daily`.

### Tarea 7: Navegación, dashboard, búsqueda y exportación

**Files:** Modify `src/components/app-shell/nav.ts`, `mobile-create.ts`,
`global-search.tsx`, `mobile-create.test.ts`, `src/app/(app)/layout.tsx`,
`src/app/(app)/dashboard/page.tsx`, `src/features/dashboard/queries.ts`,
`src/features/search/{search,search.test}.ts`, `src/app/api/search/route.ts`,
`src/features/exports/{data,backup-tables}.ts`, `README.md`. Create
`src/features/exports/reminder-export.test.ts` y
`src/features/dashboard/components/upcoming-reminders.tsx`.

**Interfaces:** `getMobileCreateAction('/reminders...')` devuelve
`{href:'/reminders?new=1',label:'Nuevo recordatorio',module:'reminders'}`.
`getUpcomingReminders(limit=5)` devuelve solo filas visibles y su estado.
Export targets `reminders` y `reminder_events` usan permiso reminders y RLS.
Notificación/búsqueda llevan a `/reminders/id`; retorno de login usa safeNext.

- [ ] Pruebas rojas de acción +, targets permitidos y exportación: admin exportando
  no obtiene personales ajenos, tampoco sus conteos/referencias; exportación con view
  válida y sin módulo rechazada. Backup general incluye solo categorías/registros/
  eventos visibles por RLS, nunca tablas de dispositivos, cola o preferencias ajenas.
- [ ] Integrar menú Hogar, búsqueda por título/referencia permitida, campanita de
  bandeja, bloque dashboard y preferencias. Sin permiso reminders ocultar acciones
  y datos nuevos, manteniendo intacta la navegación existente.
- [ ] Comprobar + repetido después de guardar/cancelar mediante consumo de `new=1`,
  conteos en vivo sin suscripciones filtradas solo en cliente y errores conservados.
- [ ] Documentar configuración VAPID, activación por dispositivo, revisión diaria,
  iOS, privacidad del backup, cron y límites de entrega. No incluir secretos reales.
- [ ] Tests en verde y commit `feat: connect reminders throughout the app`.

### Tarea 8: Verificación, revisión y publicación

**Files:** Modify pruebas previas solo para fallos reales y registrar resultados
en este plan. `.superpowers/sdd/2026-10-17-reminders-and-notifications/progress.md`
conservará el avance local, sin agregar datos privados al repositorio.

- [ ] Ejecutar `npm run check` y `npm run build`; esperar éxito completo y rutas
  /reminders, /reminders/id, /notifications y cron compiladas.
- [ ] Revisar permisos e invariantes SQL con dos sesiones/roles aislados, historial
  del ejemplo, recurrencias, cola y cambios mientras se envía. Probar las migraciones
  completas en PostgreSQL de prueba, incluida separación del enum.
- [ ] Revisar UI con datos ficticios en escritorio y 360/390 px: notas y mantenimiento,
  calendarios, categorías, + repetido, modales con error, teclado, foco, textos largos
  y movimiento reducido. No declarar probado teclado físico solo por emular ancho.
- [ ] Solicitar una revisión independiente del conjunto mediante la guía de revisión;
  corregir hallazgos materiales y repetir solamente los checks afectados y finales.
- [ ] Confirmar proyecto enlazado y migraciones con `npx supabase migration list --linked`
  y `npx supabase db push --linked --dry-run`; proceder solo con las migraciones del
  módulo revisadas y sin cambios ajenos pendientes. No crear registros de prueba reales.
- [ ] Aplicar migraciones compatibles, regenerar tipos con `npm run db:types`, retirar
  contratos temporales y ejecutar checks finales. Generar VAPID solo servidor y
  configurar variables en el proyecto correcto sin mostrar la clave privada.
- [ ] Integrar el trabajo aprobado y publicar en Vercel con autorización vigente.
  Verificar READY, alias, rutas protegidas y archivo Service Worker público y válido.
- [ ] Con participación del usuario, habilitar un dispositivo autorizado y enviar
  su aviso de prueba explícito; comprobar recepción con la app cerrada. Si requiere
  intervención, indicar exactamente el paso pendiente y no afirmar entrega verificada.
- [ ] Registrar comprobaciones y límites reales; entregar enlace del módulo y los
  pasos para activar notificaciones. No confundir deploy exitoso con push probado.

## Revisión del plan

Las tareas 1–3 cubren registro, historial y UX; 4–6 cubren bandeja/dispositivos/envío;
7 integra el resto de la app y 8 verifica/publica. Cada riesgo de Review Focus tiene
prueba en su tarea. Se conserva un único módulo de permisos, siete tablas nuevas y
un cron independiente. El plan no introduce recomendaciones de salud ni operaciones
financieras, ni promete precisión/entrega que la plataforma no garantiza.

Pendiente de revisión del usuario antes de iniciar implementación inline.
