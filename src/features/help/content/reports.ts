import type { Manual } from "../types";

export default {
  title: "Reportes",
  summary:
    "Entiende cómo entra y sale el dinero del hogar en el período que elijas: totales, gastos por categoría, tendencia de 12 meses y evolución del patrimonio.",
  sections: [
    {
      title: "Elegir el período",
      text: "Al entrar, el reporte muestra desde el día 1 del mes actual hasta hoy.",
      steps: [
        "Escoge la fecha en **Desde** y la fecha en **Hasta**.",
        "Toca **Aplicar** para recalcular todo el reporte con ese rango.",
      ],
      tips: ["Si pones las fechas al revés, la app las ordena sola."],
    },
    {
      title: "Los totales de arriba",
      text: "**Ingresos del período** y **Gastos del período** suman lo registrado en el rango. **Diferencia** es ingresos menos gastos: si es negativa, gastaste más de lo que entró.",
    },
    {
      title: "Gráficas y tablas",
      tips: [
        "**Gastos por categoría**: la dona y la tabla muestran cuánto se fue en cada categoría dentro del rango.",
        "**Ingresos y gastos · 12 meses**: barras por mes de los últimos 12 meses hasta el final del rango elegido.",
        "**Evolución del patrimonio**: tus cuentas menos lo que debes en tarjetas, más lo que te deben y menos lo que debes en Préstamos.",
        "**Gastos por método de pago**: cuánto pagaste con efectivo, débito, tarjeta, etc.",
        "**Movimientos por usuario**: ingresos y gastos de cada persona del hogar.",
        "**Gastos por proyecto**: gastos ligados a un proyecto en ese período.",
      ],
    },
    {
      title: "Descargar el reporte",
      steps: [
        "Aplica primero el rango que quieres.",
        "Toca **Descargar CSV** o **Descargar Excel**.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Solo cuentan ingresos y gastos publicados. Las transferencias entre cuentas y los movimientos pendientes no se suman.",
        "Los abonos de préstamos y deudas no aparecen como ingreso ni como gasto; sí se reflejan en el patrimonio.",
        "La gráfica de patrimonio queda vacía si aún no tienes cuentas creadas.",
      ],
    },
  ],
} satisfies Manual;
