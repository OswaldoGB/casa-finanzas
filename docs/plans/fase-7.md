# Fase 7 — Exportación, búsqueda y pulido

1. Descargas CSV/Excel de tablas autorizadas, preservando filtros de la pantalla; respaldo JSON de datos del hogar y reporte mensual Excel con hojas por módulo, exclusivos del admin. Archivos privados se conservan por separado del JSON; no se exportan credenciales.
2. Búsqueda global Ctrl/Cmd+K y acceso móvil: navegación, creación rápida y resultados de módulos con permiso de lectura. Consultas limitadas para búsqueda, exportación paginada sin truncar filas.
3. Manifest, ícono de aplicación y metadatos para agregar a inicio; sin caché offline de datos privados. Script de datos de ejemplo exclusivo de desarrollo y con ejecución explícita.
4. Orden por arrastre de categorías con alternativa por teclado; foco/labels/tablas móviles y estado de cargas/errores. Comprobación final de permisos, cálculos, descargas, lint/typecheck/build y revisión de navegador.

## Cierre

- Exportaciones paginadas CSV/Excel por módulo y filtros; proyecciones descargan el horizonte y escenario visibles. Catálogos y recurrentes exclusivos del administrador.
- Respaldo JSON incluye todas las tablas de negocio, permisos y referencias de archivos privados. Excel mensual incluye hojas por módulo; distingue registros del mes y estados actuales.
- Búsqueda global con Ctrl/Cmd+K, acceso móvil, resultados limitados y permisos explícitos además de RLS.
- Manifest y PNG 192/512/Apple180, orden por arrastre con Subir/Bajar, foco visible, salto al contenido, estados de carga y error con `retry` de Next16.
- Seed exclusivo de dev, requiere `--confirmar` y evita duplicados; no se cargaron datos Demo durante esta fase.
- Verificación: lint/typecheck y 83 pruebas pasan; `npm run build` pasa; tres controles del seed pasan. Prueba remota de desarrollo con 1001 movimientos: CSV/Excel sin truncar, filtros correctos, nombres legibles y permisos de búsqueda/descarga. Usuario y registros temporales eliminados al terminar.
- Navegador: búsqueda con teclado y móvil de 390 px, navegación a presupuestos, Listas inferior activa, descargas JSON/mensual y Excel de proyecciones sin mensajes de error. Ancho de documento = ancho disponible, sin desborde horizontal. Se restauró el tamaño normal.
- Revisión independiente encontró metadata de comprobantes faltante y etiquetas de movimientos ausentes; ambas corregidas con pruebas vistas fallar y pasar. Las contraseñas no forman parte del respaldo.
- Decisión: fotos/comprobantes se guardan por separado del JSON, que conserva las rutas y vínculos; no se anuncia restauración automática. No se crea una sesión administrativa para probar: se usa la sesión existente del navegador.
- Publicación pendiente como última tarea, según la instrucción del usuario. La documentación final se prepara antes de publicar.
