# Fase 4 — Presupuestos y proyecciones

1. Presupuestos por categoría y mes: importe base, arrastre optativo solo de sobrante, edición/borrado, copia del mes anterior sin sobrescribir filas existentes. El gasto incluye publicados de la categoría exacta; subcategorías separadas para evitar doble conteo. El sobrante acumulado se calcula por secuencia de meses consecutivos.
2. Agregados SQL autorizados por módulo: presupuesto disponible/gastado, datos para proyecciones aunque no exista permiso a movimientos. RLS de lectura/escritura por hogar y módulo; categorías de gasto del mismo hogar.
3. Proyección de efectivo disponible a 3/6/12 meses: saldos cash/checking/savings, recurrentes activos, pagos de tarjetas y presupuestos. Evitar contar dos veces gastos recurrentes dentro de la misma categoría presupuestada. Tarjetas: deuda pendiente actual y cargos recurrentes futuros pasan a sus vencimientos. Escenarios hipotéticos no se guardan.
4. Pantallas en español, barras 70/90/100%, gráfica con tabla accesible, aviso de negativo. Dashboard incorpora presupuestos del mes respetando permiso independiente de dashboard.
5. Pruebas de arrastre/copia/fechas/proyección y RLS, lint/typecheck/build y revisión visual; commit y respaldo.

Decisión: proyecciones son una estimación, las reglas confirmables se incluyen como previstas y no se inventan ingresos no programados. Presupuestos futuros usan el plan del mes actual si no hay uno explícito; el gasto restante del mes actual resta lo ya publicado.

Cierre: 64 pruebas aprobadas, lint/typecheck/build sin errores. scripts/verify-budgets.mjs comprobó arrastre positivo, continuidad mensual, copia idempotente, permisos none/view/edit y agregados para dashboard/proyecciones sin acceso a movimientos. Revisión corrigió corte de gastos a hoy y fallback futuro por categoría. En navegador se probó un gasto hipotético de $100: saldo negativo y alerta correctos, sin guardarlo; vista móvil sin desbordamiento.
