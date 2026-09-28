# Fase 8 — Publicación y documentación final

La publicación se realiza después del desarrollo, conforme a la última instrucción del usuario.

## Preparación terminada

- Fases 0–7 implementadas; fase 7 publicada en el repositorio privado con `f687391`.
- Lint, tipos, 83 pruebas y compilación de producción correctos. Pruebas remotas de permisos y exportación paginada, registros de prueba limpiados.
- Guía `docs/DEPLOY.md` y README en español: Supabase Free separado, Vercel Hobby, migraciones, cinco variables, cierre de registro, URLs de Auth, cron diario, móvil, respaldos y solución de problemas.
- Buckets privados y cron definidos en migraciones y `vercel.json`; `.env.example` completo; secretos excluidos de Git.
- Sin SMTP obligatorio: el usuario indicó que no necesita recuperación por correo.

## Última tarea pendiente

1. Acceso a la cuenta Vercel del usuario y creación del proyecto Supabase de producción Free, sin reutilizar datos de desarrollo.
2. Aplicar migraciones a producción, cerrar registro público y configurar variables/URLs.
3. Publicar, inicializar el administrador y verificar el dominio HTTPS y acceso desde móvil/otra red.
4. Registrar el dominio y resultados de las comprobaciones finales. La documentación preparada no acredita un despliegue realizado.
