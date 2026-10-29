import type { Manual } from "../types";

export default {
  title: "Proyecciones",
  summary:
    "Anticipa cuánto efectivo tendrás al cierre de cada mes y prueba qué pasaría con un ingreso o gasto extra.",
  sections: [
    {
      title: "Ver tu proyección",
      steps: [
        "Elige el **Horizonte**: **3 meses**, **6 meses** o **12 meses**.",
        "Revisa **Efectivo actual** (efectivo, cuentas bancarias y ahorros) y **Saldo al final del horizonte**.",
        "Mira la gráfica **Efectivo al cierre de cada mes** y la tabla con **Entradas**, **Salidas previstas** y **Saldo** por mes.",
      ],
      tips: [
        "Si algún mes queda en negativo verás un aviso en rojo con el mes en que pasa.",
        "Con **Descargar CSV** o **Descargar Excel** exportas la tabla, incluido el escenario si está activo.",
      ],
    },
    {
      title: "Probar un escenario",
      text: "En **¿Y si…?** puedes simular un ingreso o gasto sin registrarlo.",
      steps: [
        "Elige el **Tipo**: **Gasto** o **Ingreso**.",
        "Escribe el **Importe** y la **Fecha**.",
        "Toca **Probar escenario**. La gráfica y la tabla se recalculan.",
        "Toca **Quitar escenario** para volver a la proyección normal.",
      ],
      tips: [
        "El escenario no se guarda ni crea movimientos.",
        "Solo se refleja si la fecha está dentro del horizonte elegido.",
      ],
    },
    {
      title: "Qué toma en cuenta",
      tips: [
        "Los saldos publicados de efectivo, bancos y ahorros.",
        "Los recurrentes activos, incluidos los que necesitan confirmación.",
        "Los pagos de tus tarjetas en su fecha de vencimiento y las cuotas de compras a plazos.",
        "Tus presupuestos: reservan efectivo en el mes del gasto. Los meses sin presupuesto usan el presupuesto base actual.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "No incluye intereses, compras futuras que no hayas programado ni ingresos que no registraste.",
        "Para una proyección más fiel, registra tus ingresos y pagos fijos como recurrentes y mantén al día tus presupuestos.",
      ],
    },
  ],
} satisfies Manual;
