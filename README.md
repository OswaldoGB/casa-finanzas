# Casa & Finanzas

Aplicación web para organizar las finanzas y el hogar: cuentas, tarjetas de crédito, movimientos, presupuestos, préstamos, metas de ahorro, listas de compra, inventario y proyectos compartidos.

Está construida con **Next.js 16**, **TypeScript** y **Supabase**. Cada instalación tiene su propio hogar, usuarios y permisos por módulo.

## Qué incluye

- Cuentas, efectivo, inversiones y tarjetas de crédito con pagos desde una o varias cuentas.
- Compras con cuotas, incluso si algunas cuotas ya fueron pagadas.
- Ingresos, gastos, transferencias y movimientos recurrentes.
- Presupuestos, proyecciones, reportes, exportaciones CSV/Excel y respaldo JSON.
- Préstamos con abonos, edición completa, origen desde cuenta o tarjeta y filtros por estado.
- Metas de ahorro y provisiones, listas de compra, inventario con fotos y proyectos.
- Roles de administrador y miembro, con acceso `Sin acceso`, `Ver` o `Editar` por módulo.
- Interfaz adaptable para móvil, tema claro/oscuro y acceso mediante navegador desde cualquier red.

## Crear tu propia instalación

1. Haz un **Fork** de este repositorio en GitHub.
2. Crea dos proyectos de Supabase: uno para desarrollo y otro para producción.
3. Sigue [Desarrollo local](#desarrollo-local) para preparar el proyecto de desarrollo.
4. Sigue [Despliegue en producción](#despliegue-en-producción) para publicar tu fork en Vercel.

No copies la base de datos, las variables ni los archivos `.env` de otra instalación. Cada fork debe usar sus propias llaves y su propio proyecto Supabase.

## Requisitos

- [Node.js](https://nodejs.org/) 24 o superior.
- Una cuenta de [Supabase](https://supabase.com/) y un proyecto por entorno.
- Una cuenta de [Vercel](https://vercel.com/) para publicar la aplicación.
- [Supabase CLI](https://supabase.com/docs/guides/cli) se ejecuta con `npx`; no requiere instalación global.

## Desarrollo local

Clona tu fork e instala las dependencias:

```bash
git clone https://github.com/TU_USUARIO/casa-finanzas.git
cd casa-finanzas
npm install
```

Crea `.env.local` desde el ejemplo:

```bash
cp .env.example .env.local
```

Completa estas variables con los datos de tu proyecto de **desarrollo**. Las encuentras en Supabase → **Project Settings → API**.

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública usada por el navegador con las políticas RLS. |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave privada, usada solo en el servidor para crear usuarios y procesar tareas. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` durante el desarrollo. |
| `CRON_SECRET` | Cadena aleatoria privada para autorizar el proceso diario. |

> Nunca publiques `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` ni ningún archivo `.env`. Todos están ignorados por Git salvo `.env.example`.

Aplica el esquema y genera los tipos:

```bash
npx supabase login
npx supabase link --project-ref TU_REF_DE_DESARROLLO
npx supabase db push
npm run db:types
```

En Supabase → **Authentication → URL Configuration**, configura para desarrollo:

- **Site URL:** `http://localhost:3000`
- **Redirect URL:** `http://localhost:3000/auth/confirm`

Inicia la app:

```bash
npm run dev
```

Abre [http://localhost:3000/setup](http://localhost:3000/setup) y crea el hogar y la primera cuenta administradora. Después de esa configuración inicial, el registro público queda cerrado y el administrador crea a los demás miembros desde **Ajustes**.

## Datos de demostración

Puedes cargar datos ficticios solo en el proyecto de desarrollo:

```bash
node --env-file=.env.local scripts/seed-dev.mjs --confirmar
```

El script crea datos con el prefijo `Demo ·` y se bloquea fuera del proyecto de desarrollo configurado. No lo uses en producción.

## Verificar cambios

Antes de subir cambios, ejecuta:

```bash
npm run check
npm run build
```

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Inicia el servidor local. |
| `npm run check` | Ejecuta lint, tipos y pruebas. |
| `npm run build` | Genera la compilación de producción. |
| `npm run db:types` | Regenera `src/lib/supabase/database.types.ts` desde el proyecto enlazado. |
| `npm run format` | Aplica Prettier al proyecto. |

Los scripts `verify-*.mjs` crean y eliminan datos temporales. Ejecútalos únicamente contra desarrollo y revisa el encabezado de cada script antes de usarlo.

## Despliegue en producción

### 1. Crea y prepara Supabase

Crea un proyecto Supabase independiente para producción. En la raíz de tu fork:

```bash
npx supabase link --project-ref TU_REF_DE_PRODUCCION
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
```

Confirma siempre el identificador del proyecto antes de aceptar `db push`. Las migraciones crean las tablas, funciones, políticas RLS, buckets privados y permisos necesarios. No modifiques una migración que ya se haya aplicado; agrega una nueva para cada cambio de esquema.

En Supabase → **Authentication → Sign In / Providers**, desactiva **Allow new users to sign up**. Mantén habilitado el inicio de sesión por correo y contraseña. La primera persona administradora se crea desde `/setup`; los demás usuarios se crean dentro de la app.

### 2. Importa el fork en Vercel

1. Abre [Vercel](https://vercel.com/new) e importa tu fork.
2. Selecciona **Next.js** y deja la raíz del repositorio como directorio raíz.
3. Usa Node.js 24 y `npm run build` como comando de compilación.
4. En **Settings → Environment Variables**, agrega estas variables para **Production**:

| Variable | Valor |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL de tu Supabase de producción. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública del mismo proyecto. |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave privada del mismo proyecto. |
| `NEXT_PUBLIC_SITE_URL` | Dominio HTTPS final de Vercel, sin `/` al final. |
| `CRON_SECRET` | Cadena aleatoria privada de al menos 32 caracteres. |

Publica y espera el estado **Ready**. Si cambias una variable pública, vuelve a desplegar porque se incorpora durante la compilación.

Después de conocer el dominio final, actualiza en Supabase → **Authentication → URL Configuration**:

- **Site URL:** `https://tu-dominio.example`
- **Redirect URL:** `https://tu-dominio.example/auth/confirm`

Abre `https://tu-dominio.example/setup`, crea el administrador y guarda sus credenciales en un gestor de contraseñas antes de compartir el enlace.

### 3. Comprueba el cron diario

[`vercel.json`](vercel.json) programa `/api/cron/recurring` una vez al día para procesar movimientos recurrentes. Vercel envía `CRON_SECRET` automáticamente. No abras esa ruta sin autorización: debe responder `401` por diseño.

Vercel puede ejecutar el cron dentro de la hora programada, no en un minuto exacto. La app también revisa vencimientos al entrar y evita crear duplicados.

## Personalizar tu fork

- Cambia colores, tipografía y animaciones en [`src/app/globals.css`](src/app/globals.css).
- Ajusta navegación y módulos visibles en [`src/components/app-shell/nav.ts`](src/components/app-shell/nav.ts).
- Revisa el alcance funcional y las decisiones del producto en [`docs/SPEC.md`](docs/SPEC.md).
- Mantén separados los entornos de desarrollo y producción. Prueba las migraciones en desarrollo antes de publicarlas.

## Seguridad y mantenimiento

- Los buckets `receipts` e `inventory` son privados; no los hagas públicos para resolver un problema de acceso.
- Las políticas de Supabase controlan los permisos; ocultar un enlace no sustituye esa protección.
- Descarga periódicamente el respaldo JSON desde **Ajustes** y conserva por separado los archivos de Storage. El respaldo no incluye contraseñas ni los objetos privados de Storage.
- Supabase puede pausar proyectos gratuitos por inactividad. Reactiva el proyecto desde su panel si sucede y entra a la app para procesar pendientes.
- La recuperación de contraseña por correo requiere configurar SMTP en Supabase si deseas ofrecerla a usuarios finales.

## Licencia

Este repositorio aún no declara una licencia. Antes de hacerlo público, añade una licencia que defina cómo otros pueden usar, modificar y redistribuir el código.
