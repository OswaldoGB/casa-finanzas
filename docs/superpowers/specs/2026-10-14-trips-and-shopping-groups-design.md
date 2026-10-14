# Viajes y listas de compra por lugar

Estado: diseño propuesto para revisión. No implementado ni publicado.

## Objetivo y alcance acordado

Permitir que los miembros del hogar planifiquen un viaje por día, relacionen
comidas y actividades con lo que deben comprar y comparen el presupuesto con
los gastos reales. Una lista puede incluir distintos lugares de compra y varios
pagos, conservando su total general. Cada gasto existe una sola vez en Movimientos.

Referencia: el presupuesto de playa compartido por el usuario separa alojamiento,
gasolina, alimentos y snacks, relaciona los alimentos con menús diarios y compara
cantidad × precio previsto con el gasto real. Los precios incluyen impuestos.

Incluido: viajes compartidos, agenda diaria, conceptos presupuestados, productos
asociados a actividades, lista organizada por lugar, pagos independientes,
comprobantes existentes, enlaces entre pantallas y actualización sin recargas.

Fuera de esta entrega: mapas, reservas externas, recetas automáticas, conversión
de unidades, reparto de deudas, conversión de monedas e importación del Excel.

## Decisiones de integración

- Añadir «Viajes» al menú del hogar y usar un proyecto existente como base
  financiera de cada viaje. No crear un segundo presupuesto financiero paralelo.
- Mantener Proyectos para los demás casos de uso; identificar los viajes y
  dirigir sus enlaces de detalle y edición a la experiencia de Viajes.
- Usar los permisos de Proyectos para consultar y editar viajes. Las compras
  conservan los de Listas de compra y registrar gastos requiere Movimientos.
- Asociar una lista opcionalmente a un proyecto; las listas habituales también
  pueden usar lugares y pagos independientes sin pertenecer a un viaje.
- Mantener Presupuestos como control mensual por categoría. El presupuesto del
  viaje abarca todas sus fechas: un gasto cuenta en ambos controles, pero nunca
  se duplica en saldos, reportes o totales del hogar.

## Experiencia de Viajes

### Listado y creación

Tarjetas con nombre, destino, fechas, estado y resumen de presupuesto. Crear un
viaje pide nombre, destino, inicio, fin, participantes (texto libre opcional) y
presupuesto máximo. Estados: planeado, en marcha, terminado y archivado.

El botón + móvil abre la creación correspondiente. Formularios en modales,
campos monetarios con calculadora y confirmaciones del sistema actual.

### Cuatro vistas dentro del viaje

1. **Resumen:** máximo, estimado, gasto real, previsto todavía sin pagar y
   proyección final. Mostrar también margen frente al máximo y número de
   conceptos sin precio, sin presentar datos incompletos como un total definitivo.
2. **Por día:** tarjetas plegables para cada fecha; desayuno, almuerzo, cena,
   snacks, salida, experiencia u otro. Cada actividad admite título, horario
   opcional, lugar, notas y productos o conceptos de presupuesto asociados.
3. **Presupuesto:** alojamiento, transporte, comidas, compras y demás conceptos
   con cantidad, precio unitario estimado, total estimado, real y diferencia.
4. **Compras:** la lista vinculada, sus lugares, progreso y compras registradas;
   enlazar a su detalle para comprar y a los movimientos para consultar recibos.

Una actividad puede ser gratuita y no requiere una línea de presupuesto.
Los gastos generales, como Airbnb o gasolina, no necesitan asociarse a un día.

### Menús y productos

Desde una actividad se agregan productos o se vinculan productos ya presentes
en la lista. Ejemplo: pancakes del domingo necesitan mezcla, leche y huevos.
Cada vínculo conserva su cantidad requerida y unidad.

Si otra actividad necesita el mismo producto, se ofrece usar la línea existente
y sumar la cantidad requerida. La consolidación es explícita y solo entre
unidades iguales; nombres parecidos no se fusionan automáticamente. Si se
comprará el mismo producto en dos tiendas, se mantienen dos líneas.

La cantidad de compra puede ser mayor que la requerida (por paquetes) y debe
mostrarse separadamente. Cambiar necesidades no altera compras ya registradas:
se indica la diferencia y el usuario añade o ajusta una línea pendiente.

«Ya lo tenemos» retira la línea de lo que falta comprar y de los costos de esta
lista. No modifica existencias del módulo Inventario ni registra un gasto.

## Listas por lugar y compras independientes

Cada lista admite lugares creados por el usuario (PriceSmart, Selectos,
Panadería, etc.) y una sección «Por decidir» para artículos sin lugar. No se
requiere un catálogo global de tiendas. Cada lugar muestra subtotal estimado,
carrito actual, pagado y progreso; en móvil se presenta como sección plegable.

Los artículos pendientes pueden moverse entre lugares conservando cantidades,
precios y vínculos al viaje. Un lugar vacío puede borrarse; si tiene pendientes,
estos pasan a «Por decidir». Si tiene compras registradas se archiva, conservando
el nombre histórico de cada compra.

Estados visibles de artículo: pendiente, en carrito, comprado, ya lo tenemos y
no comprar. «En carrito» aún no es un gasto. Los artículos comprados se consultan
como historial y no vuelven a incluirse en el siguiente pago.

### Registrar una compra

1. Elegir un lugar y marcar sus artículos en carrito.
2. Completar precios reales unitarios, que ya incluyen impuestos.
3. «Registrar compra» muestra artículos y total; pide cuenta o tarjeta, categoría
   de gasto, fecha y método opcional. Usa una cuenta por compra, como el flujo actual.
4. Confirmar crea atómicamente un movimiento de gasto y una compra vinculada;
   únicamente esos artículos pasan a comprados.
5. Mostrar una sola confirmación y actualizar lista, viaje y saldos. Ofrecer
   «Ver movimiento / adjuntar comprobante».

Se puede volver a la misma tienda y registrar otra compra con los pendientes.
Para comprar solo parte de una cantidad, el usuario divide la línea pendiente
en dos cantidades antes del pago. No se implementará fraccionamiento implícito.
Los artículos gratuitos pueden acompañar a otros; una compra de total cero no
crea un movimiento y se resuelve con «Ya lo tenemos» o «No comprar».

Pendientes de otras tiendas permanecen en la misma lista; no se trasladan
automáticamente a una copia. La lista queda terminada cuando ya no hay artículos
pendientes ni en carrito y tiene al menos un artículo. Una lista vacía no se
completa automáticamente. Se puede reabrir una lista para agregar pendientes,
sin convertir artículos comprados en pendientes ni recrear sus gastos.

## Reglas financieras

- **Máximo:** límite decidido por el usuario, independiente de los estimados.
- **Estimado:** suma de cantidades × precios estimados de compras y conceptos
  generales. Un producto compartido por varias actividades se cuenta una vez.
- **Real:** movimientos de gasto confirmados asociados al proyecto del viaje,
  contados por identificador único. No sumar nuevamente las compras vinculadas.
- **Previsto pendiente:** estimados de conceptos todavía sin pagar y productos
  pendientes/en carrito; si existe precio real en carrito, usarlo para la proyección.
- **Proyección final:** real + previsto pendiente. Advertir precios faltantes.
- **Diferencia:** estimado − real solo para conceptos comparables ya pagados;
  positivo es ahorro y negativo es sobrecosto. Sin gasto real, mostrar «Pendiente».

Una línea presupuestada de alojamiento puede vincular varios movimientos
(anticipo y resto). Cada movimiento se asigna completo a una única línea, o queda
como gasto del viaje sin asignar. Se puede vincular un gasto existente sin crear
otro, siempre dentro del mismo hogar y respetando permisos de movimientos.

Los productos de la lista aparecen como líneas del presupuesto del viaje; no
se permite sumar además un concepto manual de la misma compra como otro gasto.
Los menús muestran sus productos, pero no aportan otro costo por sí mismos.

Pagos antes del viaje y fuera de sus fechas siguen contando en el viaje. El
presupuesto mensual usa la fecha y categoría reales del movimiento. Asociar
una lista a un proyecto después de tener compras requiere sincronizar también
sus movimientos en una operación autorizada, mostrando el cambio al usuario.

Los importes se validan en servidor y se calculan en centavos; cantidades admiten
tres decimales. UI y SQL comparten la regla de redondeo del total a dos decimales.
Si se edita el monto de un movimiento de compra, conservarlo como fuente del
gasto real y mostrar la diferencia contra el desglose, sin repartirla silenciosamente.

## Modelo de datos propuesto

Reutilizar `projects`, `transactions`, `shopping_lists`, `shopping_list_items`
y el sistema de comprobantes. Añadir únicamente las relaciones necesarias:

- Detalle de viaje con `project_id` único, destino y participantes.
- Actividades con viaje, fecha, tipo, hora opcional, lugar, notas y orden.
- Conceptos presupuestados generales con viaje, categoría opcional, cantidad,
  precio estimado y vínculo opcional a actividad.
- Relación entre conceptos y movimientos, sin asignaciones monetarias parciales.
- `project_id` opcional en listas; grupos/lugares pertenecientes a cada lista.
- Estado de resolución y lugar de cada artículo; vínculos a actividades con
  cantidades requeridas. Mantener compatibilidad con el carrito `checked` durante
  la migración y centralizar la derivación de estados para evitar contradicciones.
- Compras registradas por lista con lugar, nombre histórico del lugar,
  movimiento único y artículos incluidos. Una línea comprada pertenece a una compra.

Todos los vínculos validan hogar y pertenencia (artículo/lista, lugar/lista,
actividad/viaje y proyecto/lista). Nuevas tablas llevan RLS e índices para sus
consultas. Las reglas financieras se ejecutan en RPCs transaccionales.

## Compatibilidad y correcciones

Actualmente `close_shopping_list` crea un único gasto y cierra toda la lista;
`shopping_lists.transaction_id` guarda ese vínculo. No reutilizar esa columna
como si soportara varios pagos.

Migrar cierres existentes a una compra histórica por lista sin crear, borrar ni
modificar movimientos o saldos. Solo artículos anteriormente marcados se asocian
a esa compra. Los no comprados de listas históricas permanecen explícitos como
históricos no comprados: no reabrir listas ni sumar nuevas obligaciones al migrar.
Mantener el acceso al comprobante original y los nombres de tienda existentes.

Al duplicar una lista, copiar productos, lugares y estimados; quitar compras,
estados pagados y vínculos financieros. La nueva lista queda abierta. Un vínculo
al viaje se elige explícitamente, evitando aumentar su proyección por una copia.

Al borrar un movimiento de compra mediante el flujo autorizado actual, revertir
solo su compra: sus artículos vuelven al carrito, la lista se reabre si corresponde
y se recalculan los totales. No tocar compras de otras tiendas. Mantener las
restricciones actuales sobre gastos financiados. Los movimientos muestran la
cascada viaje → lista → lugar → artículos y enlaces de retorno accesibles.

Editar datos de una compra pagada no debe permitir cambiar el desglose sin
reconciliar su movimiento. En la primera versión, el desglose queda fijo: se
corrige anulando el movimiento autorizado y registrando nuevamente la compra.

## Concurrencia y UX

Al pagar, bloquear la lista y los artículos seleccionados, validar estados y
permisos otra vez en base de datos y usar una clave de operación idempotente.
Dos dispositivos o un reintento no pueden pagar el mismo artículo dos veces.

Continuar usando la suscripción compartida actual y extenderla a lugares y
compras. Tras guardar, refrescar datos sin navegación completa; revertir cambios
optimistas si falla el servidor. Formularios no muestran campos irrelevantes,
los errores conservan lo escrito y los botones se bloquean mientras guardan.

Respetar la tipografía, colores personalizables, modales, calculadora, alertas y
movimiento reducido existentes. El + contextual se puede usar repetidamente.
En móvil no hay desbordamiento lateral ni superposición con la navegación inferior.

## Orden de implementación y aceptación

Primero habilitar lugares y compras parciales de listas, incluyendo migración,
historial y borrado; después integrar Viajes sobre esa base. Terminar con enlaces,
exportaciones existentes, navegación, permisos y verificación móvil.

Casos de aceptación:

1. Planificar cuatro días con menús y actividades gratuitas o pagadas.
2. Vincular leche a dos desayunos y contar su compra una sola vez.
3. Comprar en Selectos, dejar PriceSmart pendiente y pagar PriceSmart otro día.
4. Registrar una segunda compra de Selectos sin repetir los productos ya pagados.
5. Vincular Airbnb y gasolina existentes y comprobar totales sin duplicación.
6. Ver presupuesto mensual y viaje correctos cuando sus fechas cruzan dos meses.
7. Rechazar doble pago concurrente, referencias de otro hogar y permisos insuficientes.
8. Borrar una compra y recuperar solo sus artículos, conservando las demás.
9. Comprobar que los cierres antiguos conservan importe, comprobante y estado.
10. Mostrar costos desconocidos y compras pendientes sin tratarlos como ahorro.
11. Exportar el presupuesto y las compras con lugar, estado y vínculo al viaje.
12. Crear/editar repetidamente en móvil, sin recarga completa ni notificaciones duplicadas.

Pruebas: cálculos y esquemas con Vitest, invariantes y migraciones con las pruebas
SQL/PGlite existentes, comprobación visual móvil/escritorio y compilación de Next.
La verificación de UI utiliza datos de prueba y no modifica gastos reales del hogar.
