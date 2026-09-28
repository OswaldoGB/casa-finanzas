# Fase 3 — Dashboard y reportes

Objetivo: convertir los movimientos publicados en un resumen útil y reportes por fecha, sin exigir acceso al módulo Movimientos a quien solo tenga permiso de Dashboard o Reportes.

1. RPC de agregados con autorización por módulo, hogar verificado y pendientes excluidos. Montos agrupados por categoría, método y autor; tendencia de doce meses y evolución de saldos de cuentas.
2. Dashboard: patrimonio de cuentas, saldo por cuenta, ingresos/gastos del mes y próximos pagos de recurrentes/tarjetas. Los indicadores de presupuestos, préstamos y metas se incorporarán cuando existan sus tablas en las fases siguientes.
3. Reportes: rango de fechas, dona de gastos por categoría, tendencia mensual, ingreso/gasto, patrimonio y tablas por método, usuario y proyecto. Los nombres de proyectos se incorporarán en Fase 5.
4. Gráficas responsivas con tablas legibles y estados vacíos; USD y español.
5. Pruebas de agregación/permiso, check, build y revisión móvil; commit y respaldo antes de Fase 4.

Verificación: 54 pruebas y build aprobados en integración inicial; se añadieron dos pruebas de pagos de tarjeta después de la revisión. El script de permisos en Supabase confirma agregados sin lectura de movimientos, pendientes excluidos, pagos después del corte y dos ocurrencias semanales en el horizonte. La revisión corrigió el corte de saldos a hoy, cuentas creadas después del período, transferencias de efectivo y doble conteo del abono recurrente a tarjeta. Reportes y dashboard revisados en navegador a 390 px, sin desbordamiento horizontal.
