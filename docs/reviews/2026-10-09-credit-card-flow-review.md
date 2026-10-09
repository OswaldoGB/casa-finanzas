# Revisión del flujo de tarjetas de crédito

Fecha: 2026-10-09. Revisión de la aplicación publicada, vista móvil y código en `c328e70`. No se registraron, editaron ni borraron movimientos reales durante la revisión. Este documento omite nombres, identificadores y saldos personales.

## Resultado

La pantalla mezcla la estimación de la App con el importe exigible del banco. Puede mostrar un corte saldado y un importe pendiente al mismo tiempo. La información de cuotas todavía no refleja de forma completa los pagos de cortes. La corrección debe abarcar presentación, conciliación y los consumidores de esos datos.

## Decisiones que deben conservarse

- El usuario registra el pago de contado del banco y la fecha límite de ese corte.
- El día de corte es fijo. La fecha de pago introducida para cada estado es la referencia oficial; el día configurado solo permite una estimación identificada como tal.
- El total de la App se mantiene visible como comparación. Una diferencia no crea ni elimina movimientos o deuda automáticamente.
- El importe del banco incluye las cuotas del corte. Pagarlo completo salda ese corte y las cuotas efectivamente vinculadas a él; no salda las cuotas futuras ni todas las compras de la tarjeta.
- Se puede pagar desde una o varias cuentas. El pago es una transferencia y no otro gasto.
- Los pagos parciales cubren primero los cortes más antiguos y después las cuotas incluidas más antiguas. No anticipan cuotas futuras.
- Los planes pueden ser nuevos o estar incluidos en la deuda existente, admitir importe original o pendiente y conservar las cuotas pagadas antes de registrarlos.

## Hallazgos

### 1. Importe pendiente y vencimiento contradictorios

`src/app/(app)/accounts/[id]/page.tsx:147` presenta un día de pago como fijo. En las líneas 163 y 298, el resumen y el formulario usan `statement.unpaid`, calculado por la App, incluso cuando existe un estado del banco saldado. `card-statement-cards.tsx:28` añade un segundo resumen independiente.

**Corrección:** una sola fuente para el estado visible del corte. Con estado registrado, mostrar el pendiente del banco y su fecha oficial. Sin estado, mostrar estimación pendiente de confirmación. Mostrar la diferencia Banco/App como comparación, sin pedir que se pague automáticamente.

### 2. Progreso de cuotas incompleto

`page.tsx:191` usa únicamente las cuotas pagadas al registrar el plan. El importe pendiente conserva `plan.amount`. La próxima cuota se busca por fecha y puede saltarse una cuota vencida aún pendiente. El calendario conserva un aviso que contradice el seguimiento de pagos introducido después.

**Corrección:** combinar las cuotas previas registradas con la cobertura posterior, sin modificar ese dato histórico ni el calendario original. Mostrar pagada, incluida pendiente y futura; buscar la primera cuota realmente pendiente. Separar planes finalizados.

### 3. Estados históricos sin cuotas vinculadas

En la aplicación publicada se observó un estado saldado sin cuotas vinculadas aunque existen cuotas en sus calendarios con la misma fecha de corte. No se confirmó durante esta revisión cuándo se crearon esos registros.

La migración `20261009000039_card_statement_installment_settlement.sql` crea vínculos al guardar un estado, sin recuperar estados anteriores. Su helper recorre también cuotas antiguas no vinculadas, por lo que una recuperación indiscriminada podría atribuirlas al corte incorrecto.

**Corrección:** recuperar únicamente asociaciones justificadas por tarjeta, plan, número y corte. Conservar el pago existente y los saldos. Los casos ambiguos requieren una corrección explícita del registro. No mostrar “0 de 0 saldadas” como si fuera información completa.

### 4. Corte saldado con cuotas pendientes por diferencia Banco/App

El reparto de la migración limita los importes asignados a cuotas al dinero pagado. Si las cuotas vinculadas suman más que el importe oficial del banco, el corte puede quedar saldado y esas cuotas continuar pendientes. Se reprodujo el mismo límite en el helper puro con importes ficticios.

**Corrección:** distinguir el dinero asignado de la cobertura de cuotas por un corte oficialmente saldado. No inventar asignaciones monetarias mayores al pago. La vinculación debe ser correcta antes de acreditar cobertura.

### 5. Vista previa y registro pueden repartir de forma diferente

`card-payment-preview.ts` consume los estados en el orden recibido. La consulta ordena por vencimiento; la función de registro ordena por corte. Con fechas límite variables, esos órdenes pueden diferir. La vista previa también cuenta estados con pendiente cero y no explica dinero sobrante fuera de cortes.

**Corrección:** usar el mismo orden por corte, excluir saldados, respetar la fecha del pago y explicar el reparto y cualquier importe sin aplicar a un corte. La función de registro debe impedir aplicar un pago anterior al corte a ese estado.

### 6. Editar o borrar una transferencia de pago deja relaciones inconsistentes

`src/features/transactions/actions.ts` permite tratar transferencias asociadas a pagos como movimientos genéricos. La edición no recalcula la conciliación. El borrado del movimiento no elimina necesariamente el pago raíz y sus asignaciones.

**Corrección:** gestionar las correcciones desde el pago completo, con todas sus cuentas y conciliación en una operación. Impedir modificar una sola transferencia como si fuera independiente y ofrecer el acceso al pago de origen.

### 7. Inicio y Proyecciones pueden ocultar pendientes

`src/features/analytics/queries.ts:96` toma el primer estado de cada tarjeta aunque esté saldado. La línea 119 excluye vencidos. `src/features/projections/queries.ts:17` descarta vencidos y su filtro de cuotas identifica por tarjeta, fecha e importe, lo que puede confundir dos compras del mismo valor.

**Corrección:** seleccionar pendientes reales, conservar los vencidos y deduplicar cuotas mediante plan y número de cuota. Revisar que la diferencia Banco/App no vuelva a añadirse como un segundo pago del mismo corte.

### 8. Jerarquía visual y acciones poco accesibles

La pantalla repite saldos y mantiene abiertos varios formularios y toda la configuración. En teléfono se necesita mucho desplazamiento para registrar un pago. Los formularios de tarjeta conservan selects nativos mientras la aplicación tiene un selector común.

**Corrección:** resumen compacto, corte y acción principal arriba. Agrupar Cuotas, Historial y Movimientos. Abrir acciones en modales con el selector común, resumen del resultado antes de guardar y actualización en la misma pantalla. Dejar la configuración detrás de una acción secundaria.

## Verificación realizada

- Revisión autenticada del detalle publicado y su calendario en móvil de 390 × 844. Se restauró el tamaño del navegador.
- Lectura del flujo de consultas, formularios, registro, conciliación, corrección de movimientos, Inicio y Proyecciones.
- Seis archivos de pruebas existentes: 17 pruebas correctas, incluyendo ciclo, conciliación, reparto, vista previa y proyecciones.
- Las pruebas actuales no cubren todas las contradicciones descritas. No se ejecutaron pruebas de integración SQL ni modificaciones de datos de producción.

## Casos necesarios al corregir

1. Sin estado del banco: estimación visible y pendiente de confirmar, sin declarar “Al día”.
2. Banco distinto a App: pago exacto del banco salda el corte; conserva comparación y deuda contable.
3. Cuotas vinculadas: corte saldado acredita cobertura, conserva importe monetario real y no anticipa cuotas futuras.
4. Pago parcial y fechas de vencimiento variables: vista previa coincide con el registro por antigüedad del corte.
5. Pago con varias cuentas: operación completa, idempotente y sin doble gasto.
6. Pago anterior al corte y exceso de pago: no aplica importes a cortes futuros ni inventa cobertura.
7. Corrección del pago completo: saldos y conciliación vuelven a corresponder.
8. Estados antiguos sin vínculos: recuperación determinista o advertencia explícita, sin asumir cuotas históricas.
9. Inicio y Proyecciones: pendientes actuales y vencidos, sin duplicar cuotas de igual importe.
10. Móvil y escritorio: acciones accesibles, modales utilizables y cantidades legibles sin desbordamientos.

## Corrección implementada

- Detalle con resumen único del corte, comparación Banco/App, cuotas con avance real, historial y movimientos. Registro, pago, corrección completa y configuración mediante modales.
- Migración 40: vínculos exactos por corte, recuperación histórica sin alterar movimientos, reparto coherente de pagos y corrección atómica con comprobantes conservados. Un vínculo ambiguo con dinero asignado se conserva y requiere revisión explícita.
- Los planes registrados después de confirmar un corte heredan sus pagos existentes; se conserva el número de cuotas pagadas antes del registro. La conciliación no inventa importes para igualar al banco.
- Inicio y Proyecciones conservan pendientes vencidos. Las cuotas futuras siguen su calendario completo, incluso fuera del horizonte de la gráfica; una diferencia en la deuda contable no acredita cuotas futuras.
- Revisión independiente cerrada y 140 pruebas correctas en 41 archivos, incluidas 15 pruebas SQL con PostgreSQL aislado y datos ficticios. Lint, tipos y compilación de producción correctos. No se hicieron pagos de prueba sobre datos personales.
