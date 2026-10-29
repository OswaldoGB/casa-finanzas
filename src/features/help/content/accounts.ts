import type { Manual } from "../types";

export default {
  title: "Billetera",
  summary:
    "Tus saldos en un solo lugar: efectivo, cuentas bancarias, ahorros, inversiones y tarjetas de crédito, con el control de cortes y pagos de cada tarjeta.",
  sections: [
    {
      title: "Crear una cuenta o tarjeta",
      steps: [
        "Toca **Nueva cuenta**.",
        "Escribe el **Nombre** y elige el **Tipo**: Efectivo, Cuenta corriente, Ahorros, Tarjeta de crédito, Inversión u Otra.",
        "Indica el **Saldo inicial (USD)**. Si es tarjeta, el campo se llama **Deuda inicial (USD)**: lo que debes hoy.",
        "Elige **Color**, **Ícono** y, si no es efectivo, el **Banco o emisor**.",
        "Para una tarjeta completa **Datos de la tarjeta de crédito**: **Límite de crédito (USD)**, **Red de tarjeta**, **Variante**, **Últimos cuatro dígitos** (opcional), **Día de corte** y **Día de pago estimado**.",
        "Toca **Crear cuenta**.",
      ],
      tips: [
        "El tipo no se puede cambiar después de crear la cuenta.",
        "Las tarjetas se muestran primero, en **Tus tarjetas**; el resto aparece en **Tus cuentas**.",
      ],
    },
    {
      title: "Ver, editar o archivar una cuenta",
      text: "Toca cualquier cuenta para ver su **Saldo actual** y sus **Movimientos recientes**. Toca un movimiento para abrir su detalle.",
      steps: [
        "En una cuenta, baja a **Editar cuenta**, cambia lo necesario y toca **Guardar cambios**.",
        "Si ya no la usas, toca **Archivar cuenta**. En una tarjeta, abre el engrane **Configurar tarjeta** y toca **Archivar tarjeta**.",
      ],
      tips: [
        "Las cuentas archivadas pasan a la lista **Archivadas** y conservan su historial.",
      ],
    },
    {
      title: "Entender tu tarjeta de crédito",
      text: "Al abrir una tarjeta verás arriba la **Deuda total** (incluye compras nuevas y cuotas futuras), el **Crédito disponible** con tu límite y la fecha del **Próximo corte**.",
      tips: [
        "El bloque **Este corte** muestra cuánto debes pagar. Antes de confirmar dice **Pago estimado por la App**; después de confirmar, **Pendiente según el banco** con su **Fecha límite**.",
        "La etiqueta indica el estado: **Por confirmar con el banco**, **Pendiente**, **Pago parcial**, **Vencido** o **Corte saldado**.",
        "Abre **Ver comparación Banco / App** para ver la diferencia entre lo que calculó la App y lo que dice el banco. Esa diferencia no es un segundo pago.",
        "Las pestañas **Resumen**, **Cuotas**, **Historial** y **Movimientos** organizan el resto de la información.",
      ],
    },
    {
      title: "Confirmar el estado del banco y pagar la tarjeta",
      steps: [
        "Cuando recibas tu estado de cuenta, toca **Confirmar estado del banco**.",
        "Revisa la **Fecha de corte**, escribe el **Pago de contado según el banco** y la **Fecha límite de pago**. Puedes añadir una **Nota opcional**. Toca **Guardar estado del banco**.",
        "Para pagar, toca **Pagar este corte** (o **Registrar otro pago**).",
        "Indica la **Fecha del pago**, elige la **Cuenta de origen** y el **Aporte (USD)**. Si pagas desde varias cuentas, usa **Añadir otra cuenta**.",
        "Revisa el **Total del pago** y toca **Registrar pago de tarjeta**.",
      ],
      tips: [
        "El monto del banco ya incluye las cuotas del corte; no las sumes otra vez.",
        "El pago se aplica automáticamente del corte más antiguo al más reciente.",
        "Para corregir un pago ve a **Historial**, busca el pago en **Pagos registrados** y toca **Corregir pago**. Para corregir un estado, usa **Corregir estado**.",
      ],
    },
    {
      title: "Compras a plazos",
      steps: [
        "En la pestaña **Cuotas**, toca **Añadir compra a plazos**.",
        "En **Qué vas a registrar** elige **Compra nueva: sumar gasto y deuda** o **Plan ya incluido en mi deuda** (si la compra ya estaba en tu deuda inicial).",
        "Completa **Descripción**, el monto, el número de cuotas y las fechas. En una compra nueva elige la **Categoría del gasto**.",
        "Toca **Registrar compra a plazos**.",
      ],
      tips: [
        "Cada plan muestra cuántas cuotas van pagadas y lo que queda **Por cubrir**. Abre **Ver calendario y cobertura** para ver cada cuota.",
        "Una compra nueva se registra una sola vez como gasto; las cuotas mensuales no generan otro gasto.",
      ],
    },
    {
      title: "Abonarle a una compra",
      text: "En la pestaña **Abonos** de la tarjeta sigues una compra hecha con ella y le vas abonando hasta liquidarla.",
      steps: [
        "Elige la compra en **Compra a la que quieres irle abonando** y toca **Seguir compra**.",
        "En la compra, escribe el monto, la fecha y la cuenta de la que sale, y toca **Abonar**.",
        "Ves cuánto llevas abonado y cuánto falta. Al completar el total queda **Liquidada**.",
      ],
      tips: [
        "Cada abono es un pago real a la tarjeta: baja la deuda y se aplica al corte más antiguo, como cualquier pago.",
        "No puedes abonar más de lo que falta de esa compra.",
        "Si dejas de seguir una compra, los pagos que ya hiciste a la tarjeta se conservan.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "El saldo de una tarjeta es deuda: sube con cada compra y baja con cada pago.",
        "Un pago de tarjeta se guarda como transferencia desde tu cuenta: no se cuenta como otro gasto.",
        "Si pagas de más, la App muestra **Saldo a favor en la App** en lugar de deuda.",
        "Solo puedes crear o editar cuentas si tienes permiso de edición en Billetera.",
        "Con **Descargar CSV** o **Descargar Excel** exportas tus cuentas.",
      ],
    },
  ],
} satisfies Manual;
