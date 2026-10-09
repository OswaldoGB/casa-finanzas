# Conciliación visual de cortes y cuotas de tarjeta

## Objetivo

Cuando una persona registra el estado de cuenta de su banco, ese importe pasa a
ser la referencia del corte. Al pagar el estado completo, Casa & Finanzas debe
mostrarlo como saldado y reconocer como pagadas las cuotas que ese corte ya
incluía. El cálculo de la app se conserva como comparación y explicación, no
como una segunda deuda que se cobre de nuevo.

Las personas usuarias suelen pagar el total. Los pagos parciales se aplican de
forma determinista: primero al estado de cuenta más antiguo y, dentro de este,
a las cuotas más antiguas. Una cuota solo queda saldada al quedar cubierta por
completo.

## Alcance y reglas

- El estado conciliado guarda el pago de contado oficial del banco, el total
  calculado por la app, la fecha de corte y la fecha límite.
- Al guardar un estado, se toma una fotografía de las cuotas cuyo corte es
  igual o anterior a ese estado. Esa fotografía no cambia si después se edita
  un plan de cuotas ni si la app recalcula fechas.
- Un pago de tarjeta se distribuye automáticamente entre estados pendientes,
  del más antiguo al más reciente. La pantalla deja de pedir distribuciones
  manuales.
- Un estado queda **Saldado** cuando sus pagos acumulados alcanzan el importe
  indicado por el banco. En ese momento, todas sus cuotas fotografiadas quedan
  saldadas, porque forman parte del importe que el banco exigió.
- Si un pago es parcial, el dinero del estado se asigna primero a las cuotas
  fotografiadas en orden de fecha y número. Una cuota cambia a saldada solo
  cuando sus abonos cubren su importe; el resto reduce compras de contado de
  ese mismo estado.
- Un pago que exceda los estados conciliados puede reducir la deuda de la
  tarjeta, pero no adelanta cuotas futuras que todavía no han llegado a su
  corte.
- Los valores existentes de `paid_installments` siguen representando cuotas
  que ya estaban pagadas antes de registrar el plan. Los pagos nuevos no
  modificarán esa columna: se registrarán de forma auditable por cuota.

## Modelo de datos

Se añaden dos registros de auditoría:

1. `card_statement_installments`: líneas de cuota incluidas en un estado.
   Guarda `statement_id`, `plan_id`, número de cuota, fecha de corte, fecha de
   pago e importe. La combinación estado/plan/cuota es única.
2. `card_installment_payment_allocations`: parte de un pago de tarjeta que
   cubre una línea de cuota. Guarda `card_payment_id`, la línea conciliada y el
   importe aplicado. Varias asignaciones pueden completar una misma cuota.

El procedimiento de pago existente se reemplaza por una operación atómica que:

1. crea los movimientos de transferencia desde una o varias cuentas;
2. reparte el total a los estados conciliados pendientes, por fecha de corte;
3. registra las asignaciones a estados;
4. si un estado queda saldado, marca todas sus líneas de cuota como cubiertas;
5. si queda parcial, asigna el importe disponible a sus líneas de cuota en
   orden y conserva cualquier remanente como abono de contado.

El procedimiento de guardar el estado crea o actualiza su fotografía de
cuotas. No permite cambiar un estado que ya tenga pagos de una forma que deje
sus asignaciones inválidas.

## Experiencia visual

La cabecera de tarjeta se convierte en un resumen visual de tres cifras:

- **Deuda total:** deuda actual de la tarjeta, incluidas cuotas aún futuras.
- **Próximo pago según banco:** importe conciliado más cercano y su fecha.
- **Cuotas futuras:** importe que aún no ha entrado en un corte.

Cada estado conciliado se presenta como una tarjeta con:

- periodo de corte y fecha límite;
- comparación clara entre Banco y App, incluida la diferencia y la nota;
- barra de progreso pagado;
- chip de estado: Pendiente, Parcial o Saldado;
- cantidad de cuotas incluidas y cuántas están saldadas.

Cada compra a plazos muestra un progreso por cuotas con estados visuales:
pagada, incluida en el próximo corte y futura. El calendario conserva el
detalle de fechas e importes y explica el corte al que pertenece cada cuota.

El formulario de pago muestra una sola cantidad sugerida: la suma de los
estados pendientes, empezando por el más próximo. También indica qué estados
se saldarán con el importe elegido; la asignación sucede automáticamente al
guardar.

## Consultas, panel y proyecciones

- El detalle de tarjeta obtiene estados con sus líneas conciliadas y abonos.
- Los próximos pagos, el dashboard y las proyecciones usan el pendiente del
  banco para un estado conciliado. No vuelven a sumar sus cuotas incluidas.
- Las cuotas futuras siguen apareciendo en proyecciones solo desde su próximo
  corte no conciliado.
- Los listados muestran pagos de tarjeta con el estado o estados que cubrieron
  para que su origen sea entendible al consultar movimientos.

## Casos de error

- No se puede pagar más que la deuda de la tarjeta en la fecha indicada.
- No se puede cambiar el importe de un estado por debajo de lo ya abonado.
- No se puede duplicar una cuota dentro de dos estados.
- La operación es idempotente mediante el identificador de solicitud actual;
  reintentarla no duplica movimientos ni asignaciones.

## Pruebas

- Estado pagado por completo: cambia a Saldado y todas sus cuotas incluidas
  avanzan como pagadas.
- Pago parcial: reparte por antigüedad y solo completa cuotas cubiertas.
- Dos estados pendientes: un pago cubre el más antiguo antes de tocar el
  siguiente.
- Diferencia entre App y Banco: el banco sigue siendo el importe exigible y no
  se duplican cuotas en las proyecciones.
- Cuotas futuras: permanecen pendientes hasta que llegue su corte.
- Reintento del mismo pago: no genera transferencias ni asignaciones duplicadas.
