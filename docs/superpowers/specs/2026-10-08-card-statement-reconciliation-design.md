# Conciliación de estados de cuenta de tarjetas

## Objetivo

Dar a cada tarjeta una lectura fiel de lo que exige el banco en cada período, sin perder el cálculo independiente de Casa & Finanzas. La diferencia entre ambos importes debe ser visible y explicable, especialmente cuando compras hechas antes del corte entran al siguiente estado por procesamiento bancario.

## Alcance y criterios de éxito

- El día de corte sigue configurado en la tarjeta y no cambia por estado.
- Tras cada corte, una persona con permiso de edición puede registrar el estado emitido por el banco.
- Cada estado guarda el monto de contado oficial y su fecha límite real, que puede variar de un mes a otro.
- La aplicación conserva el monto calculado para el mismo corte y muestra ambos valores junto con su diferencia.
- Un pago desde una o varias cuentas se asigna a estados pendientes, empezando por el más antiguo, sin duplicar gastos ni alterar compras originales.
- Las cuotas muestran avance, saldo, próxima cuota y el estado de cuenta donde vence cada cuota.
- Los movimientos y los pagos existentes conservan su comportamiento y sus saldos históricos.

## Modelo de datos

Se incorpora `card_statements` como fuente de conciliación, con un registro único por tarjeta y fecha de corte:

| Campo | Significado |
| --- | --- |
| `card_id`, `household_id` | Tarjeta y hogar propietarios. |
| `closes_on` | Fecha fija de corte calculada desde la configuración de la tarjeta. |
| `starts_on` | Inicio informativo del período. |
| `due_on` | Fecha límite real indicada por el banco. |
| `app_total` | Monto calculado por Casa & Finanzas al guardar el estado. |
| `bank_cash_due` | “Pago de contado según el banco”, ingresado por la persona usuaria. |
| `bank_minimum_due` | Opcional; se reserva para una futura ampliación sin condicionar el flujo inicial. |
| `note` | Nota opcional, por ejemplo “compra del 6 procesada en el siguiente corte”. |
| `created_by`, `created_at` | Auditoría. |

El monto de banco es una fotografía conciliada. No reescribe transacciones, cuotas ni el saldo de la tarjeta. La diferencia se calcula como `bank_cash_due - app_total`: positiva cuando el banco exige más y negativa cuando procesó menos de lo esperado.

Se incorpora `card_statement_allocations` para asociar un pago de tarjeta con uno o varios estados. Cada fila contiene `card_payment_id`, `statement_id` y `amount`. La suma de asignaciones nunca excede el pago ni el saldo de contado pendiente del estado.

Los pagos previos a esta funcionalidad permanecen sin asignación: siguen reduciendo la deuda total como hoy. Los estados nuevos calculan su pendiente usando exclusivamente sus asignaciones posteriores, sin reinterpretar movimientos históricos.

## Flujo de estado de cuenta

1. La tarjeta muestra una sugerencia tras el corte: “Registrar estado del banco”.
2. El formulario precarga período, corte y el total calculado por la app. Muestra también las cuotas que caen en ese corte.
3. La persona ingresa el pago de contado del banco y la fecha límite exacta; puede añadir una nota para justificar diferencia.
4. Al guardar, se conserva el estado y aparece una comparación clara: “App”, “Banco” y “Diferencia”.
5. Si el banco aún no emitió el estado, la tarjeta mantiene una estimación etiquetada como tal; no se crea un estado ficticio.
6. El historial permite consultar estados cerrados y su conciliación; el último estado puede editarse para corregir una digitación, siempre que no se reduzca por debajo de lo ya pagado.

## Flujo de pago

La sección “Pagar tarjeta” prioriza el estado con vencimiento más próximo. Muestra su pago de contado bancario, ya pagado y pendiente. La persona puede pagar parcialmente o añadir cuentas de origen como ahora.

Al guardar el pago:

1. Se crea el mismo pago/transferencias actuales, por lo que las cuentas y la deuda total se actualizan como hoy.
2. El importe se asigna automáticamente al estado pendiente más antiguo; si lo cubre, el resto avanza al siguiente estado pendiente.
3. La interfaz confirma cómo se repartió el pago. Cuando no existen estados conciliados, conserva el comportamiento actual y lo marca como pago general de tarjeta.

No se permite pagar más que la deuda total en la fecha del pago. Tampoco se permite que un estado registre un monto bancario menor a lo ya asignado.

## Experiencia de cuotas

La lista actual de planes se convierte en tarjetas compactas y escaneables:

- Nombre, chip “Cuota X de Y” y estado (activa o próxima a terminar).
- Barra de progreso basada en cuotas pagadas y pendientes.
- Saldo pendiente y cuota mensual prominentes.
- Próximo corte, fecha límite obtenida del estado conciliado cuando exista, y etiqueta “estimada” si aún no hay estado de banco.
- Un desplegable “Ver calendario” para no saturar la pantalla; incluye cuotas pasadas, actual y futuras.
- Las cuotas ya avanzadas conservan el progreso registrado al crear el plan.

Estas tarjetas se adaptan a móvil con una sola columna. El calendario y los importes usan ancho fijo/`tabular-nums` para no provocar recortes horizontales.

## Permisos, consistencia y errores

- Se reutilizan los permisos existentes de edición de Cuentas y Movimientos para registrar estados y pagos.
- Todas las mutaciones se implementan como funciones SQL `security definer`, comprobando hogar, tarjeta activa, permisos, importes con dos decimales y pertenencia de cada recurso.
- Los registros usan IDs de solicitud para mantener la idempotencia de formularios.
- Al editar un estado ya pagado se valida que el nuevo pago de contado siga siendo igual o mayor al importe asignado.
- Borrar un estado solo se permite si no tiene asignaciones; de otro modo se pide editar o revertir los pagos involucrados.

## Migración y compatibilidad

La migración agrega las dos tablas, índices, RLS y funciones de creación/actualización/asignación. No modifica la semántica de `accounts`, `transactions`, `card_payments` ni de los planes de cuotas existentes.

Las consultas de detalle de tarjeta integran los estados conciliados cuando existan y continúan produciendo el resumen estimado para tarjetas sin estados. Proyecciones y dashboard pueden usar primero el próximo estado conciliado; si no existe, siguen usando el cálculo actual.

## Validación

- Pruebas unitarias para la asignación de pagos por antigüedad, cálculo de diferencias y límites de edición.
- Pruebas de esquema para los datos de estado y pago.
- Pruebas SQL/manuales para RLS, idempotencia y límites de saldo.
- Revisión en escritorio y móvil de la tarjeta, el formulario de estado, el pago multi-cuenta y el listado de cuotas.
