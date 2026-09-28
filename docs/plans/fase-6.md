# Fase 6 — Préstamos y ahorro

1. Préstamos que el hogar otorga: alta genera loan_out; abonos loan_repayment parciales sin superar lo pendiente; estado active/paid/written_off, resaltado de vencidos. Dinero prestado/recuperado/pendiente derivados de movimientos publicados, excluidos de ingresos/gastos.
2. Metas y provisiones: objetivo, fecha/cuenta opcional/color/icono; aportes/retiros y sugerencia mensual. Con cuenta vinculada son transferencias de cuentas y requieren origen/destino distintos; sin cuenta son apartados virtuales que no alteran saldo. Retiros no superan lo aportado.
3. Operaciones atómicas con bloqueo del préstamo/meta y permisos de ambos módulos cuando se genera movimiento. Catálogos por hogar, RPC agregados independientes para dashboard y módulo respectivo. Patrimonio añade préstamos activos pendientes por cobrar.
4. Dashboard incorpora pendientes y progreso de metas; proyecciones admiten transferencias de metas. Pruebas puras de pendientes/aporte mensual, SQL/RLS y visual, check/build y respaldo.

Cierre: scripts/verify-savings.mjs aprobado dos veces, incluyendo dos abonos concurrentes, límite de retiros, saldo virtual/vinculado y agregados independientes. Dashboard añade pendientes por cobrar al patrimonio; reporte histórico conserva la fecha del cierre incobrable. Proyecciones admiten aportes/retiros y abonos recurrentes. Lint/typecheck/build aprobados; 75 pruebas pasan. Pantallas de préstamos, metas y panel revisadas en navegador con estados vacíos y permisos.
