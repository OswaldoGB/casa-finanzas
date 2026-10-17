# Recordatorios, notas y notificaciones — Diseño

Fecha: 17 de octubre de 2026.
Estado: propuesta funcional y especificación escrita aprobadas por el usuario; plan de implementación en revisión.

## Propósito y decisiones del usuario

Llevar un historial útil de cosas realizadas y recordar las próximas: aceite y
pastillas de frenos de la pickup, desparasitación de perros, exámenes y pendientes
del hogar. El usuario quiere categorías, una interfaz coherente con la app y avisos
tanto dentro de ella como en el teléfono, incluso cuando la aplicación esté cerrada.
La propuesta funcional fue aprobada con «Nice, vamos».

La entrega comprende un módulo nuevo, no operaciones financieras. Su criterio de
éxito es poder registrar lo hecho ayer, preparar lo siguiente y recibir un aviso
comprensible sin perder historial ni exponer registros personales a otros miembros.

## Enfoque elegido y alternativas

Se incorporará a la app existente un módulo de Recordatorios y una bandeja de
notificaciones, utilizando Supabase, los componentes actuales y Web Push estándar.
Un proceso diario de Vercel preparará avisos sin depender de una pestaña abierta.
No se necesita una app nativa ni un servicio de correo o mensajería contratado.

Usar solo avisos al entrar sería más sencillo, pero no satisface los avisos con la
app cerrada. Un calendario externo o una app nativa añadiría cuentas, sincronización
y mantenimiento innecesarios para este caso. Web Push conserva todo en la web app.

## Alcance de producto

Tres tipos de registro:

- **Nota:** título, contenido, categoría, referencia y privacidad, sin vencimiento.
- **Puntual:** los mismos datos con fecha y hora opcional, o umbral de kilometraje.
- **Recurrente:** próxima ocasión y regla para preparar otra al completar la actual.

Las categorías iniciales serán Vehículos, Mascotas, Salud, Estudios, Hogar y
Personal, cada una con color e ícono del catálogo Lucide instalado. Se podrán crear
y editar categorías propias del hogar; archivar una categoría conserva sus registros.
Estas categorías son independientes de las categorías financieras.

La **referencia** será texto opcional reutilizable mediante sugerencias: Pickup,
nombre del perro o materia. No se crearán inventarios separados de vehículos,
mascotas o cursos. El filtro y las sugerencias solo usarán registros accesibles.

No se incluyen archivos adjuntos, recomendaciones de dosis o mantenimiento,
sincronización con calendarios, correo, WhatsApp, geolocalización, lectura automática
del vehículo ni creación automática de gastos.

## Creación y edición

Crear y editar se hará en modal, con campos condicionales por tipo y programación.
El formulario permite título, notas, categoría, referencia, privacidad y los avisos.
Los límites serán título 120 caracteres, referencia 80 y notas 5.000. No habrá HTML
ejecutable ni editores enriquecidos nuevos.

La opción **Ya lo realicé** permite introducir fecha real, observaciones y kilometraje
opcional. Si hay repetición se guarda ese evento y se calcula la siguiente ocasión
atómicamente; si no la hay queda un registro completado o una nota histórica, según
el tipo elegido. La vista previa mostrará el resultado antes de guardar.

Una nota podrá convertirse en recordatorio añadiendo programación. Quitar la fecha
no borrará el historial; si quedan kilómetros, seguirá siendo un recordatorio. Sin
fecha ni kilómetros, pasará a nota y cancelará los avisos pendientes.

Las categorías no impondrán intervalos de mantenimiento o salud. Cada usuario decide
cuándo repetir; no se inferirán dosis, tratamientos ni intervalos mecánicos.

## Fechas, recurrencia y kilometraje

Las fechas serán días de calendario en la zona horaria del hogar, reutilizando las
funciones existentes cuando su contrato sea compatible. La hora opcional sirve para
ordenar y mostrar un examen o compromiso; no promete un aviso push a ese minuto.

La recurrencia admitirá cada N días, semanas, meses o años, con dos bases:

- **Desde que lo realicé:** parte de la fecha real introducida al completar.
- **Calendario fijo:** mantiene el día ancla de la serie. Los meses cortos usan su
  último día y recuperan el día ancla en el mes siguiente. El 29 de febrero sigue
  la misma regla en años no bisiestos.

Habrá una sola ocasión pendiente por serie. Completar una ocasión de calendario
fijo saltará los vencimientos ya pasados hasta la primera fecha posterior tanto a
la fecha realizada como al día actual; no fabricará eventos realizados ni una cola
de tareas atrasadas. El historial identificará los periodos omitidos por ese salto.
En la base desde realización, si la siguiente fecha calculada ya pasó, se conserva
como vencida: no se falsea cuándo se hizo el mantenimiento.

Posponer cambia la fecha efectiva de la ocasión actual y conserva la fecha original
para el historial y la repetición de calendario fijo. La siguiente ocasión no se
crea al posponer. Pausar desactiva avisos sin completar la tarea; reanudar la evalúa
de nuevo. Archivar conserva el registro y su historial, sin avisos.

El kilometraje es opcional, admite valores no negativos con hasta un decimal y solo
se muestra al elegir seguimiento por kilómetros. Se registran lectura actual,
kilometraje objetivo y, para repetición, intervalo. Al completar se solicita la
lectura de realización; el próximo objetivo es esa lectura más el intervalo.

Si se usan fecha y kilómetros, vence por el criterio que se alcance primero.
Actualizar una lectura evalúa el umbral inmediatamente. Nunca se estimará el uso
del vehículo entre lecturas. Sin lectura suficiente se mostrará **Kilometraje por
actualizar**, no un vencimiento inventado. Reducir una lectura pedirá confirmar una
corrección para evitar errores de captura, y conservará la lectura del historial.
Los avisos de anticipación se aplican a fechas; los kilómetros muestran lo que falta
y generan aviso al alcanzar el objetivo registrado.

## Historial y acciones

Cada realización guarda una instantánea del título, referencia, categoría, fecha
prevista, fecha realizada, notas, kilómetros y persona que la registró. Editar el
recordatorio no reescribe realizaciones anteriores.

Las acciones serán completar, posponer, editar, pausar/reanudar y archivar/restaurar.
Completar dos veces por doble toque, reintento de red o dos sesiones debe crear una
sola realización y avanzar la serie una sola vez. La operación usará bloqueo de
fila, identificación de la ocasión y clave de petición. Un intento sobre una ocasión
ya reemplazada devolverá el estado actual sin completar la siguiente.

La primera entrega no tendrá borrado físico desde la interfaz. Archivar es reversible.

## Interfaz y navegación

**Recordatorios** aparecerá en Hogar con permiso propio, búsqueda global y acceso
desde el menú móvil. El botón central + abrirá Nuevo recordatorio y funcionará en
aperturas sucesivas después de guardar o cancelar.

La vista de agenda agrupará Vencidos, Hoy y Próximos. Habrá alternativa de calendario,
selector de día y filtros por categoría, referencia, tipo, privacidad y estado.
Notas y Realizados tendrán vistas accesibles sin mezclarse con pendientes vencidos.
La lista será paginada; el calendario consultará solo el rango visible. Las tarjetas
mostrarán título, categoría, referencia, fecha relativa y estado con texto además de
color. Los textos largos no desbordarán el ancho móvil.

Al abrir una tarjeta se verá la próxima ocasión, notas, repetición e historial.
Completar y posponer serán acciones visibles; edición y archivo usarán un menú
accesible. Los cambios se reflejarán sin navegación completa, conservando los datos
escritos y mostrando un solo aviso de éxito. Se reutilizarán los modales, selectores,
calendario, botones y animaciones existentes, respetando movimiento reducido.

El dashboard incluirá una sección compacta de próximos recordatorios accesibles,
priorizando vencidos y hoy, con enlace al módulo. No mostrará datos cuando falte
permiso. Los estados vacíos incluirán una acción clara para crear el primer registro.

## Privacidad y permisos

Se añadirá `reminders` a los módulos administrables con niveles none/view/edit.
El administrador mantiene su acceso habitual al módulo; los miembros no reciben
permisos nuevos automáticamente.

Todos los registros pertenecerán a un hogar y tendrán propietario y visibilidad
**personal** (por defecto) o **hogar**. Acceder exige permiso del módulo y, además,
ser propietario o que el registro sea compartido. El rol administrador no concede
acceso a los registros personales de otra persona. Con edit se pueden modificar
los registros compartidos; solo el propietario podrá cambiar su privacidad.

La restricción se aplicará en RLS, acciones, consultas, búsqueda, agregados del
dashboard, notificaciones y exportaciones, no mediante filtrado del navegador.
El historial hereda la privacidad actual del registro: hacerlo personal retira
el acceso al conjunto a los demás miembros. El contenido ya visto no puede retirarse
de la memoria o de una exportación anterior.

Las categorías son etiquetas compartidas del hogar; no contienen notas privadas.
Cada persona solo verá su bandeja y sus dispositivos. Las suscripciones de push,
sus claves y los estados de envío no se expondrán en listados ni respaldos generales.

## Notificaciones dentro de la app

Una campanita en la cabecera mostrará contador de no leídas y bandeja con enlace al
recordatorio, fecha y acción Marcar como leída / Marcar todas. Leer un aviso no
completa el recordatorio. Completar, archivar o perder acceso retirará sus avisos
activos; un aviso ya leído puede conservarse sin contenido accesible si se revoca
el acceso al origen.

Los avisos por defecto serán 7 días antes, 1 día antes y el día del vencimiento,
editables como días de anticipación distintos, entre 0 y 365. Se podrán desactivar.
Cada usuario podrá activar o silenciar avisos de registros compartidos; sus propios
registros siguen la programación elegida en ellos. Silenciar no elimina el registro.

Si el registro se crea después de haber pasado algún plazo de aviso, se generará
solo el aviso relevante más cercano a su estado actual, no todos los atrasados.
Si el proceso diario no corrió, la recuperación aplicará la misma regla. Un vencido
permanece visible, pero no produce una notificación nueva cada día indefinidamente.

La lectura de páginas usará consultas limitadas al usuario y hogar. La preparación
de avisos al entrar será una operación explícita y autenticada con deduplicación;
no dependerá de ejecutar efectos financieros ni de modificar datos en un render.

## Push por dispositivo

La activación se hará tras pulsar **Activar notificaciones en este dispositivo**;
no se pedirá permiso al entrar sin contexto. La interfaz distinguirá compatible,
no activado, activado, bloqueado y no compatible, con instrucciones para cada caso
y un botón de aviso de prueba del dispositivo actual, accionado por el usuario.
En iPhone/iPad se explicará cuándo hace falta añadir la web a inicio.

Se empleará Service Worker y Web Push con VAPID; una dependencia de envío estándar
será admisible si no existe ya una equivalente. La clave pública será pública;
la privada permanecerá solo en servidor. Se generarán para esta instalación y se
documentarán en `.env.example` sin publicar secretos reales.

La suscripción se vincula al usuario autenticado, hogar y dispositivo. Solo ese
usuario podrá registrarla o revocarla. Un dispositivo no pertenecerá simultáneamente
a dos usuarios. Cambiar de cuenta requerirá desvincular la anterior; no se permitirá
apropiarse de una suscripción ajena presentando su endpoint. Cerrar sesión intentará
revocar la vinculación de ese dispositivo antes de terminar la sesión.

Los endpoints se validarán como HTTPS de proveedores Web Push reconocidos, con
límites de longitud y rechazo de destinos locales/privados, puertos arbitrarios y
URLs con credenciales. La ruta de registro tendrá protección de origen y sesión.

El push usará texto genérico, como **Tienes un recordatorio para hoy**, sin notas,
referencias médicas ni títulos privados en la pantalla bloqueada. Al pulsarlo abrirá
una ruta interna del origen propio, con autenticación y permisos antes de leer datos.
Si está sin sesión, se conserva el destino de retorno mediante el mecanismo seguro
existente. Nunca se aceptará una URL externa suministrada en el mensaje.

La entrega depende del permiso, conexión, navegador y ajustes del sistema. Desactivar
push no desactiva la bandeja. Un endpoint expirado (404/410) se deshabilita sin bloquear
los otros dispositivos ni la generación de avisos internos.

## Programación, concurrencia y entrega

Se incorporará un cron diario separado, protegido por `CRON_SECRET`, programado a
las 12:00 UTC, aproximadamente las 06:00 en El Salvador. Las fechas se evaluarán en
la zona del hogar; no se personaliza la hora de entrega por usuario. No se promete
precisión al minuto. La hora del examen se muestra aunque su aviso diario llegue
por la mañana. El cron de movimientos recurrentes seguirá siendo independiente.

Un identificador de ocasión y una revisión de programación distinguirán cambios
reales de agenda de simples ediciones de título o notas. Cambiar fecha, repetición,
avisos, privacidad o estado invalidará envíos pendientes de la revisión anterior.
Cada aviso tendrá identidad única por registro, revisión, destinatario y condición
de aviso. Cada entrega se deduplica por aviso y suscripción.

La cola se reclamará con bloqueo y lease con vencimiento para tolerar dos ejecuciones
o una caída. Antes de enviar se comprobarán de nuevo versión, estado, elegibilidad
del destinatario y suscripción. Las tareas se procesarán en lotes limitados para
no exceder el tiempo del servidor; los pendientes quedan persistidos para el siguiente
intento. La siguiente ejecución recupera el trabajo de un lease abandonado.

No se prometerá entrega exactamente una vez a una red externa: si el proveedor acepta
un mensaje y falla el guardado local, puede haber reintento. Se usará un tag estable
por aviso y dispositivo para reemplazar notificaciones duplicadas cuando el navegador
lo permita. Una notificación ya entregada al teléfono no se puede retirar de forma
fiable al editar o completar; su enlace siempre comprobará el estado actual.

## Datos y límites de responsabilidad

Se prevén siete tablas con claves y relaciones acotadas al mismo hogar:

- `reminder_categories`: etiqueta, color, ícono, archivo y auditoría.
- `reminders`: dueño, privacidad, tipo, contenido, programación, kilómetros,
  ocasión actual, revisión, estado y auditoría.
- `reminder_events`: historial de realización y cambios relevantes, con instantáneas.
- `reminder_preferences`: preferencias personales de avisos compartidos y push.
- `user_notifications`: bandeja personal, origen, revisión, condición y lectura.
- `push_subscriptions`: dispositivo, endpoint y material de suscripción protegido.
- `notification_deliveries`: cola, intentos, lease y resultado por dispositivo.

Las restricciones y RPCs atómicas protegerán las invariantes también ante acceso
directo por API. Las acciones comprobarán permisos antes de usar herramientas de
administrador. Las funciones privilegiadas fijarán search_path y no permitirán
elegir arbitrariamente el hogar o destinatario. Los registros financieros no se
modificarán ni se usarán como historial de estas tareas.

Las consultas normales, mutaciones, programación y envío se separarán en
`src/features/reminders/` y `src/features/notifications/`. La navegación, dashboard,
búsqueda, permisos, exportaciones, cierre de sesión, proxy, manifest y configuración
de despliegue se actualizarán solo donde integren el módulo. El Service Worker tendrá
acceso público al archivo y ámbito raíz; no introducirá caché offline de páginas
autenticadas ni interceptará los movimientos financieros.

Las exportaciones incluirán registros y realizaciones visibles al solicitante.
Los respaldos generales respetarán la privacidad personal, incluso para el admin.
No incluirán endpoints, claves de suscripción, preferencias de otros usuarios ni
la cola de entrega. Se mantendrá el patrón actual de CSV/Excel y permisos.

## Pruebas de aceptación

1. Registrar un cambio de aceite hecho ayer, con notas y próxima fecha/kilómetros;
   ver la realización histórica y exactamente una próxima ocasión.
2. Crear una nota sin fecha, un parcial con hora y un recordatorio para cada perro;
   filtros, categorías y referencias separan correctamente los registros.
3. Completar dos veces desde dos sesiones o repetir una petición: una realización,
   un solo avance y ningún aviso de la ocasión anterior pendiente de envío.
4. Completar tarde, registrar una realización antigua, posponer y cruzar meses cortos,
   año bisiesto y zonas horarias sin cambiar indebidamente el día.
5. Alcanzar un umbral de kilómetros sin fecha y actualizar la lectura; mostrar el
   aviso sin fingir mediciones automáticas. La fecha o los kilómetros bastan para vencer.
6. Validar RLS con roles reales de prueba: otro hogar, miembro sin módulo,
   view/edit, administrador frente a una nota personal ajena, y cambio de privacidad.
7. Repetir o interrumpir cron: sin bandejas duplicadas, recuperación de leases,
   catch-up sin ráfagas de avisos viejos y rechazo de ejecución sin secreto válido.
8. Completar/posponer mientras se reclama un envío: revisión invalidada y comprobación
   previa al envío; la UI no promete retirar mensajes ya entregados.
9. Activar push en un dispositivo de prueba autorizado; probar con la app cerrada,
   permiso denegado, endpoint caducado, cierre/cambio de sesión y revocación de acceso.
10. Revisar escritorio, 360/390 px y teclado móvil: formularios condicionales,
    selectores, calendario, + repetido, retención de valores ante error, textos largos,
    foco, lectores de pantalla y movimiento reducido.
11. Verificar que consultas, dashboard, búsqueda, bandeja, exportaciones y respaldos
    no revelan notas personales ni suscripciones de otra persona.

## Publicación y límites de verificación

Las migraciones deberán separar la adición del valor enum `reminders` de su uso
posterior cuando PostgreSQL lo exija. Se probarán con datos ficticios e historial
existente antes de aplicarlas al proyecto real enlazado. Se regenerarán tipos,
ejecutarán checks y build, y se verificará el despliegue en el alias habitual.

La implementación no registrará recordatorios, datos de salud ni notificaciones de
prueba a miembros reales del hogar sin una acción explícita del usuario. Las pruebas
push que requieran habilitar el navegador/dispositivo se harán con participación
del usuario; no se declarará verificado un dispositivo que no se haya probado.

Referencias de restricciones de plataforma verificadas al diseñar:
[Vercel Cron, uso y precios](https://vercel.com/docs/cron-jobs/usage-and-pricing) y
[Web Push en iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/).

## Revisión del diseño

El alcance aprobado incluye agenda, historial, notas, categorías y push. Privacidad,
idempotencia, unidades de kilometraje y avisos diarios quedan definidos arriba.
La especificación no exige servicios de pago ni alarmas al minuto exacto, y reconoce
las ventanas de carrera y entrega externas. Este documento no es una implementación.
El siguiente paso, tras su revisión por el usuario, será un plan de implementación
con tareas, pruebas y ejecución inline.
