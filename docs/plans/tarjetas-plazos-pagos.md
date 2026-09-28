# Tarjetas: compras a plazos y pagos desde varias cuentas

Ampliación aprobada por el usuario el 28 de septiembre de 2026.

El importe total financiado sigue formando parte de la deuda y del uso del límite, mientras las cuotas futuras se excluyen de lo exigible al corte. Se permite registrar compras nuevas o clasificar planes ya incluidos en el saldo sin duplicar deuda. Para planes avanzados, la persona puede indicar el monto original o el saldo pendiente, el total de cuotas y las cuotas ya pagadas: se conserva solamente el saldo pendiente, el calendario comienza en la siguiente cuota y no se crean pagos históricos. Cuotas iguales con redondeo final, primer corte definido por el usuario y fechas mensuales ajustadas al día de corte/pago de la tarjeta.

Pagos repartidos desde 1–20 cuentas activas, como transferencias, requieren edición de Cuentas y Movimientos. Se guardan juntos con validación de saldos, alcance del hogar e idempotencia. Los abonos reducen la tarjeta; el calendario muestra facturación, sin atribuir el pago a un plan particular. Quitar un plan conserva su gasto y deuda y elimina la financiación. Los comprobantes se protegen mediante una comprobación previa al borrado de un gasto vinculado.

Tablas `card_installment_plans` y `card_payments`, incluidas en respaldo JSON. Funciones de escritura con permisos explícitos y tablas protegidas por RLS. El cálculo compartido del pendiente al corte alimenta tarjeta, Dashboard y Proyecciones; las proyecciones agregan el calendario sin cobrar todo el principal el mes siguiente.

Validación: pruebas unitarias de montos/fechas/pagos y distribución de cuotas; script remoto de desarrollo con hogar temporal, importación sin deuda duplicada, cuotas de febrero y centavos, pagos desde dos cuentas, idempotencia, fallo sin escritura parcial, concurrencia, permisos, protección de borrado, proyecciones y respuesta del detalle de tarjeta. El script elimina el hogar, los registros y su usuario temporal.

También se comprobó en el navegador: importación de un plan de $300 en 3 cuotas, pendiente del corte $100, pago de $40 + $60 desde dos cuentas, deuda posterior $200 y pendiente $0; saldos de origen $460/$340. Vista de 390 px sin desbordamiento horizontal. Formulario de plazos reiniciado coherentemente después de guardar. Cuentas y registros temporales eliminados.

Los abonos anticipados superiores a lo exigible cubren primero los próximos vencimientos en la proyección, siguiendo el mismo cálculo acumulado del pendiente al corte. Se agregó una regresión para deuda pendiente de $100 con $200 nominales de cuotas futuras: los primeros $100 ya cubiertos no vuelven a programarse.

Estado de publicación previo: código guardado en `b336022`, 86 pruebas y compilación correctas; migraciones 22–24 aplicadas también en producción. El proyecto CLI vuelve a desarrollo. El primer intento fue bloqueado por Vercel al no verificar al autor. El usuario conectó `OswaldoGB-INDUPAL` en Authentication → Login Connections; el reintento `dpl_65kyxacJM2oJxYpH5nZ277uQCbx1` terminó READY y quedó publicado en https://casa-finanzas-six.vercel.app. No se cambiaron autores ni se retiró metadata para evitar el control de identidad. La publicación sigue siendo manual, sin conexión del repositorio para despliegues automáticos.

Comprobación final de producción aprobada: login y 13 módulos con sesión, restricciones anónimas y RLS de las nuevas tablas, respaldo JSON con planes/pagos, Excel mensual de 11 hojas y CSV. El verificador también abre las tarjetas activas existentes para comprobar sus formularios. No se añadieron registros de prueba en producción.
