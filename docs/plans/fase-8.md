# Fase 8 — Publicación y documentación final

La publicación se realiza después del desarrollo, conforme a la última instrucción del usuario.

## Preparación terminada

- Fases 0–7 implementadas; fase 7 publicada en el repositorio privado con `f687391`.
- Lint, tipos, 83 pruebas y compilación de producción correctos. Pruebas remotas de permisos y exportación paginada, registros de prueba limpiados.
- Guía `docs/DEPLOY.md` y README en español: Supabase Free separado, Vercel Hobby, migraciones, cinco variables, cierre de registro, URLs de Auth, cron diario, móvil, respaldos y solución de problemas.
- Buckets privados y cron definidos en migraciones y `vercel.json`; `.env.example` completo; secretos excluidos de Git.
- Sin SMTP obligatorio: el usuario indicó que no necesita recuperación por correo.

## Publicación terminada

- Dominio HTTPS estable, Vercel Ready, Node 24.x y cinco variables de producción.
- Supabase independiente, migraciones aplicadas, buckets privados, registro público cerrado y URLs de Auth configuradas.
- Administrador creado antes de publicar, sin datos financieros copiados; contraseña inicial únicamente en `.env.production-access.local`, ignorado por Git.
- Verificación remota aprobada: HTTPS, login, setup cerrado, 13 módulos autenticados, JSON sin secretos, Excel de 11 hojas, CSV, RLS anónimo y cron protegido. Sin registros de prueba añadidos.
- Corregido `email_provider_disabled`: el proveedor de correo permanece habilitado y el registro público sigue cerrado. La comprobación final verifica ambos estados.
- Publicación manual. La conexión automática de GitHub no está activada: la revisión automática rechazó el acceso continuo sin autorización explícita.
- Pantalla pública de login comprobada en navegador; vista móvil verificada durante fase 7. Prueba con celular físico y datos móviles pendiente del usuario, no afirmada como realizada.

Guía y README actualizados con dirección real, acceso inicial, publicación manual y mantenimiento.
