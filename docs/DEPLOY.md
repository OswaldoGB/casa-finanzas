# Publicar Casa & Finanzas

Guía para la última tarea del proyecto: publicar la app con **Supabase Free** y **Vercel Hobby**. Estos pasos preparan una instalación de producción independiente de desarrollo. La existencia de esta guía no significa que la app ya esté publicada.

Fuentes oficiales consultadas el **28 de septiembre de 2026**. Los proveedores pueden cambiar sus planes y pantallas.

## Antes de publicar

La app publicada tendrá una dirección HTTPS que se puede abrir desde cualquier red y dispositivo con navegador. Cada persona entra con su cuenta y el administrador decide qué módulos puede ver o editar. No hace falta mantener encendida la computadora de desarrollo.

Supabase Free permite dos proyectos activos, con 500 MB de base de datos y 1 GB de archivos por proyecto. Usa uno para desarrollo y otro para producción. Vercel Hobby admite este uso personal y no comercial; las cuotas gratuitas no garantizan disponibilidad ilimitada. Comprueba que las organizaciones elegidas sigan en Free/Hobby y evita activar pruebas o complementos de pago. [Planes de Supabase](https://supabase.com/pricing), [Vercel Hobby](https://vercel.com/docs/plans/hobby).

En el repositorio, antes de la publicación final:

```powershell
npm ci
npm run check
npm run build
```

Guarda los cambios revisados en GitHub. Los archivos `.env.local`, `.env.production.local` y `.vercel` están excluidos de Git. Mantén las contraseñas, llaves privadas y archivos de respaldo fuera del repositorio.

## 1. Crear Supabase de producción

1. Abre el [Dashboard de Supabase](https://supabase.com/dashboard) y selecciona una organización **Free**.
2. Crea un proyecto llamado, por ejemplo, `casa-finanzas-prod`. Elige una región cercana a los usuarios y guarda la contraseña de la base de datos en un gestor de contraseñas.
3. Espera a que el proyecto termine de aprovisionarse.
4. Guarda su **Project Reference**: es el identificador del proyecto, distinto del de desarrollo.
5. En las opciones de conexión/API del proyecto, copia su URL y las llaves `anon` y `service_role` de la sección de llaves heredadas. Esta app usa los nombres de variables de la tabla siguiente; no cambies esos nombres al copiarlas.

No copies cuentas, datos Demo ni contraseñas de desarrollo. Los scripts `seed-dev.mjs` y `verify-*.mjs` son exclusivos de desarrollo.

## 2. Aplicar el esquema a producción

Ejecuta desde la raíz del repositorio. Reemplaza `REF_PRODUCCION` por el identificador que acabas de guardar:

```powershell
npx supabase login
npx supabase link --project-ref REF_PRODUCCION
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Introduce la contraseña de la base de datos cuando la herramienta la solicite; no la escribas como argumento del comando. Antes de aceptar `db push`, verifica que el proyecto enlazado sea producción y que la lista de migraciones corresponda a este repositorio. La vista previa `--dry-run` no aplica cambios. [Referencia de Supabase CLI](https://supabase.com/docs/reference/cli/supabase-db-push).

Las migraciones crean tablas, funciones, permisos por módulo, políticas RLS, la publicación de las listas compartidas y los buckets privados **`receipts`** e **`inventory`**. En Storage verifica que ambos existan y no sean públicos. No hace falta iniciar Supabase local ni instalar Docker para este flujo de enlace y aplicación de migraciones.

Cuando termines de operar producción, vuelve a enlazar el proyecto de desarrollo antes de continuar programando:

```powershell
npx supabase link --project-ref REF_DESARROLLO
```

El enlace del CLI y las variables de la app son configuraciones distintas: volver a enlazar desarrollo no cambia las variables de Vercel.

## 3. Cerrar el registro público

En **Authentication → Sign In / Providers** del proyecto de producción:

- Mantén habilitado el acceso con correo y contraseña.
- Desactiva **Allow new users to sign up**.
- Mantén desactivados los usuarios anónimos y no agregues proveedores sociales para esta instalación.

Con el registro cerrado, el administrador crea al segundo usuario desde Ajustes. La app crea ambas cuentas con correo confirmado mediante la API administrativa; este flujo no envía invitaciones ni necesita SMTP. La opción de registro público desactivada permite que las cuentas existentes sigan iniciando sesión. [Configuración de Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration).

## 4. Importar el repositorio en Vercel

1. Entra a [Vercel](https://vercel.com/new) con la cuenta que tiene acceso al repositorio privado de GitHub.
2. Selecciona el equipo **Hobby** e importa `casa-finanzas`.
3. Deja **Next.js** como Framework Preset y la raíz del repositorio como Root Directory. Usa `npm run build` como comando de construcción y `main` como rama de producción.
4. Selecciona **Node.js 24.x** en Build and Deployment. [Versiones de Node admitidas](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
5. Anota el dominio estable asignado al proyecto, por ejemplo `https://casa-finanzas.vercel.app`. Ese ejemplo no es una dirección ya reservada.
6. Antes de publicar, configura las variables de **Production**:

| Variable                        | Valor de producción                                | Uso                                               |
| ------------------------------- | -------------------------------------------------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL del proyecto Supabase prod                     | Conexión pública al proyecto                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave `anon` del mismo proyecto                    | Cliente con políticas RLS                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Llave `service_role` del mismo proyecto            | Solo servidor; creación de usuarios y recurrentes |
| `NEXT_PUBLIC_SITE_URL`          | Dominio HTTPS estable de la app, sin `/` al final  | URL de la app para enlaces de autenticación       |
| `CRON_SECRET`                   | Cadena aleatoria privada de al menos 32 caracteres | Autorizar el procesamiento diario                 |

Usa un gestor de contraseñas para generar y guardar `CRON_SECRET`. Las dos variables privadas nunca llevan el prefijo `NEXT_PUBLIC_`. No publiques sus valores en capturas, commits o mensajes.

Si habilitas **Preview**, configura allí las llaves del proyecto **dev** y su URL de prueba; no selecciones todos los entornos al guardar los secretos de producción. La app no necesita conexiones ni contraseñas directas de PostgreSQL en Vercel.

## 5. Configurar URLs y publicar

En **Supabase prod → Authentication → URL Configuration** configura:

- **Site URL:** el dominio HTTPS estable de producción.
- **Redirect URLs:** `https://TU_DOMINIO/auth/confirm` y, si se usa recuperación en el futuro, `https://TU_DOMINIO/auth/confirm?next=/reset-password`.

Reemplaza `TU_DOMINIO` por el dominio real. Usa las direcciones exactas de producción y evita comodines amplios. Al cambiar de dominio, actualiza también `NEXT_PUBLIC_SITE_URL` y vuelve a desplegar. [URLs de redirección de Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

Publica desde Vercel y espera el estado **Ready**. Si modificaste las variables después de construir, utiliza **Redeploy**: las variables públicas se incorporan durante la construcción.

Abre de inmediato `https://TU_DOMINIO/setup` para crear tu hogar y la cuenta administradora. Esta pantalla inicial permite configurar al primer administrador; completa este paso antes de compartir la dirección. Una vez creado el perfil, la aplicación deja de permitir otra configuración inicial.

Desde Ajustes puedes crear la cuenta de tu pareja. Sus módulos empiezan sin acceso: asigna tú los permisos y comparte la contraseña inicial por un medio privado. Las cuentas de desarrollo no existen automáticamente en producción.

## 6. Revisar el proceso diario

El repositorio ya contiene este `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/recurring", "schedule": "0 12 * * *" }]
}
```

La hora del cron es UTC: `12:00 UTC` corresponde a `06:00` en El Salvador. Hobby admite una ejecución diaria y puede invocarla durante esa hora, sin precisión de minutos. Vercel envía `Authorization: Bearer CRON_SECRET` automáticamente. Una visita a la ruta sin el secreto debe devolver **401**. [Cron y zona horaria](https://vercel.com/docs/cron-jobs), [Administración y autorización del cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

En Vercel → **Settings → Cron Jobs**, verifica la ruta y revisa **View Logs** tras la ejecución. No es una tarea en tiempo real: Vercel puede perder o repetir una invocación y no reintenta automáticamente una ejecución fallida. La app procesa también los vencimientos atrasados al entrar y evita duplicar una misma regla/fecha. Las reglas en modo confirmación siguen pendientes hasta que las apruebes. [Entrega y errores del cron](https://vercel.com/docs/cron-jobs/manage-cron-jobs).

## 7. Comprobar el acceso final

- En una ventana privada, `/dashboard` debe enviar a `/login`; inicia sesión con la cuenta de producción.
- Desde el celular usando datos móviles, abre el mismo dominio y prueba navegar. En iPhone usa Safari → Compartir → **Agregar a inicio**; en Android busca **Agregar a pantalla de inicio** o **Instalar** en el menú del navegador. La app requiere conexión para consultar y guardar datos; no almacena una copia offline del hogar.
- Con la cuenta del miembro, comprueba los módulos que hayas autorizado. Ocultar un enlace no sustituye los controles de permisos del servidor.
- Comprueba guardar un movimiento, descargar su tabla filtrada y abrir una lista compartida en ambos dispositivos.
- Desde Ajustes descarga un JSON y un Excel mensual. Guarda los archivos fuera del repositorio.

## Pausas y respaldo

Supabase puede pausar un proyecto Free por baja actividad durante una semana. El proceso diario genera actividad cuando funciona, pero **no garantiza evitar la pausa**. Si sucede, abre el proyecto en el Dashboard y selecciona **Resume project**; espera la reactivación y vuelve a entrar a la app para procesar vencimientos pendientes. Revisa los avisos al correo del propietario del proyecto. [Pausas de proyectos Free](https://supabase.com/docs/guides/platform/free-project-pausing).

En Ajustes, el admin puede guardar un **respaldo JSON** de los registros y permisos del hogar. Contiene metadatos y rutas de fotos/comprobantes, pero no los archivos, contraseñas ni cuentas de Supabase Auth. El Excel mensual es un reporte, no un archivo de restauración. La app no tiene importador automático del JSON.

Conserva por separado los archivos de los buckets `receipts` e `inventory`, manteniendo sus rutas originales. Descárgalos desde Storage o con las herramientas oficiales. Para reconstruir otra instalación se necesitan el esquema, los datos relacionados, los archivos privados y la gestión de usuarios Auth; requiere una restauración administrada que preserve o reasigne sus identificadores. No borres el proyecto original antes de comprobar la recuperación en un destino independiente.

Free no incluye los respaldos automáticos disponibles en planes de pago. Supabase recomienda exportaciones propias fuera del servicio, y un respaldo de la base de datos tampoco incluye los objetos de Storage. Su CLI ofrece `db dump`; ese comando adicional ejecuta `pg_dump` en un contenedor y necesita Docker, a diferencia del flujo básico de despliegue anterior. [Respaldos de Supabase](https://supabase.com/docs/guides/platform/backups), [Referencia de `db dump`](https://supabase.com/docs/reference/cli/supabase-db-dump).

## Contraseñas sin correo de recuperación

Esta instalación no requiere recuperación por correo, según la decisión del administrador. Guarda las contraseñas en un gestor seguro. Una persona que conserve su sesión puede abrir `/reset-password` para cambiar la suya. Si se pierde todo acceso, un operador con control del proyecto Supabase puede cambiar la contraseña de una cuenta usando la API administrativa `auth.admin.updateUserById`, verificando primero su ID en Authentication → Users. Esa operación es de servidor y no se debe hacer con una llave pública ni desde el navegador. [API administrativa de contraseña](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).

El enlace de recuperación por correo que conserva la app no garantiza entrega a los usuarios sin SMTP propio. Si decides habilitarlo más adelante, configura Custom SMTP y revisa las URLs y plantillas de autenticación antes de ofrecerlo como recuperación. El correo predeterminado de Supabase está limitado a direcciones autorizadas del equipo y no está destinado a producción. [Correo SMTP de Supabase](https://supabase.com/docs/guides/auth/auth-smtp).

## Problemas comunes

| Síntoma                                          | Comprobación y solución                                                                                                                                  |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| La construcción falla por variables faltantes    | Revisa los cinco nombres de variables, el entorno Production y sus valores. Vuelve a desplegar después de corregirlos.                                   |
| No aparecen los datos de desarrollo              | Producción usa otro proyecto y empieza vacío. Crea el hogar allí; no ejecutes el seed Demo.                                                              |
| `/setup` dice que ya está configurado            | Inicia sesión con el administrador existente. No borres perfiles o usuarios para forzar otra configuración.                                              |
| Crear admin o miembro falla                      | Verifica `SUPABASE_SERVICE_ROLE_KEY` del mismo proyecto que la URL y que las migraciones estén aplicadas. La creación no depende de SMTP.                |
| Un miembro ve “acceso pendiente”                 | El administrador debe guardar sus permisos en Ajustes. Si deseas que opere un módulo relacionado con gastos, revisa también sus permisos de Movimientos. |
| La app deja de responder o Supabase indica pausa | Reactiva el proyecto desde su Dashboard y vuelve a entrar a la app.                                                                                      |
| Faltan tablas, funciones o buckets               | Revisa `migration list` del proyecto correcto. Aplica las migraciones pendientes con `db push`; no uses `db reset` contra producción.                    |
| Las fotos o recibos no cargan                    | Verifica buckets privados, rutas y permisos del módulo. Recarga para renovar el enlace temporal; no hagas públicos los buckets.                          |
| El cron devuelve 401                             | Revisa `CRON_SECRET` en Production y vuelve a desplegar. Abrir esa ruta manualmente sin el encabezado produce 401 por diseño.                            |
| El cron devuelve 500 o no hay ejecución          | Revisa View Logs, pausa del proyecto, variables y migraciones. Entra a la app para procesar atrasados; no supongas que Vercel lo reintentará.            |
| Se abre localhost desde un enlace de correo      | Corrige Site URL, Redirect URLs y `NEXT_PUBLIC_SITE_URL` del entorno adecuado. No dependas de correo si no configuraste SMTP.                            |
| La URL solicita una cuenta Vercel al miembro     | Revisa Deployment Protection del dominio final. El acceso diario debe usar las cuentas de Casa & Finanzas; las previews pueden seguir protegidas.        |
| Una descarga falla o contiene una tabla vacía    | Confirma la sesión, los permisos del módulo y los filtros elegidos. El JSON completo es exclusivo del admin.                                             |

En los siguientes cambios de esquema, crea una migración nueva, pruébala en desarrollo y aplícala deliberadamente a producción antes de publicar el código que la necesita. No cambies una migración ya aplicada ni asumas que un rollback de Vercel revierte la base de datos.
