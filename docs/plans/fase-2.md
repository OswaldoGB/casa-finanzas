# Fase 2 — Núcleo financiero

**Objetivo:** registrar cuentas, tarjetas, métodos, categorías y movimientos, con adjuntos, captura rápida y recurrentes confiables.

**Referencia:** `docs/SPEC.md` (decisiones acordadas al final prevalecen) y Fase 1 ya implementada. USD y UI en español. Sin registro público. Admin `edit` universal; miembro condicionado por `accounts` y `transactions`.

## Piezas

1. **Migración:** tablas `accounts`, `payment_methods`, `categories`, `transactions`, `attachments`, `recurring_rules`; claves del hogar, validaciones, índices, RLS con `has_module_access`, y bucket privado para recibos. El estado `pending` excluye movimientos de saldos y reportes.
2. **Dinero y saldos:** funciones puras con tests. Tarjeta de crédito tiene deuda positiva y resta en patrimonio. Transferencias no son gasto ni ingreso. Préstamos y aportes a metas respetan las decisiones acordadas.
3. **Configuración de catálogos:** CRUD de categorías, métodos y recurrentes solo admin; cuentas según permiso `accounts`. Formularios zod y server actions revalidan y validan sesión cada vez.
4. **Cuentas y tarjetas:** lista, detalle, creación/edición/archivo, saldo y movimientos; periodo de corte, vencimiento y uso del límite.
5. **Movimientos:** lista con filtros, subtotales diarios, crear/editar/borrar y selección múltiple; recibos comprimidos en cliente y guardados privados.
6. **Registro rápido:** botón `+`, monto primero y selección de categoría/cuenta/método recordada para reducir pasos. Sin permiso `edit`, no hay botón ni acción.
7. **Recurrentes:** modos `auto` y `confirm`; generación idempotente mediante cron protegido con `CRON_SECRET` y procesamiento de atrasos al cargar la app. La zona horaria proviene del hogar.
8. **Cierre:** `npm run check`, build, prueba de RLS y flujos contra Supabase dev, revisión en móvil/escritorio, commit español y resumen de cómo probar. No avanzar a Fase 3 hasta cerrar este bloque.

## Reglas de integración

- La base es fuente de verdad; toda escritura tiene validación zod y autorización servidor.
- No se guardan llaves de servidor en cliente; no se imprimen secretos ni contraseñas.
- Los saldos se derivan de movimientos publicados, nunca se editan directamente.
- Catálogos compartidos: lectura si existe permiso `view` en un módulo que los use; edición de cuentas requiere `accounts:edit`; categorías y métodos solo admin.
- Los módulos posteriores permanecen deshabilitados aunque sus permisos puedan configurarse desde la Fase 1.

## Cierre y verificación

- Cuentas, tarjetas, categorías, métodos, movimientos, selección múltiple, comprobantes privados y recurrentes integrados.
- Las tarjetas muestran deuda, uso del límite, último corte, vencimiento y saldo al corte. El tipo de cuenta queda fijo al crearla para preservar la interpretación del historial.
- Archivar una cuenta desactiva sus reglas recurrentes; se conserva la edición de movimientos anteriores.
- Registro rápido con monto primero y selección recordada. Categorías se ordenan con controles accesibles de subir/bajar; el gesto de arrastrar queda para el pulido de Fase 7.
- Prueba en pantalla: gasto de 12.34 desde saldo 25.00 produjo 12.66; pago de tarjeta de 10.00 redujo deuda 45.00 a 35.00; recurrente automático generado una vez pese a recargar.
- `scripts/verify-finance-permissions.mjs` comprueba none/view/edit, catálogos admin, saldos, exclusión de pendientes, tipo inmutable y desactivación de recurrentes. Usa solo el proyecto dev y elimina sus datos y usuario temporal.
- Para probar: crear una cuenta, registrar ingreso/gasto/transferencia, abrir el detalle y adjuntar un recibo; configurar un recurrente en Configuración. El cron usa `CRON_SECRET` y ejecuta una vez al día; al abrir la app también se procesan atrasos.
