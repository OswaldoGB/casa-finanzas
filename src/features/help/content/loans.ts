import type { Manual } from "../types";

export default {
  title: "Préstamos",
  summary:
    "Lleva la cuenta del dinero que prestas y de lo que tú debes. Arriba eliges la pestaña **Me deben** o **Debo**.",
  sections: [
    {
      title: "Me deben: registrar un préstamo",
      text: "Úsalo cuando le prestas dinero a alguien. El formulario está en **Nuevo préstamo**.",
      steps: [
        "Escribe la **Persona a quien prestas**, el **Monto (USD)** y la **Fecha**.",
        "Elige la **Cuenta o tarjeta desde la que prestaste**.",
        "En **¿Cómo debe afectar el saldo?** elige **Registrar la salida ahora** si el dinero aún no se ha descontado, o **Ya estaba incluido en el saldo actual** si tu saldo ya refleja esa salida.",
        "Si quieres, agrega **Fecha esperada de pago (opcional)** y **Notas**.",
        "Toca **Registrar préstamo**.",
      ],
      tips: [
        "Si prestas desde una tarjeta de crédito y registras la salida ahora, aumenta la deuda de la tarjeta.",
      ],
    },
    {
      title: "Me deben: cobrar abonos o cerrar",
      steps: [
        "En la tarjeta del préstamo abre **Registrar abono**.",
        "Escribe el monto, la fecha y la **Cuenta donde recibiste el dinero**.",
        "Toca **Registrar abono**. Cuando se recupera todo, pasa a **Préstamos pagados**.",
      ],
      tips: [
        "Si ya no te van a pagar, usa **Cerrar como incobrable** y confirma con **Cerrar préstamo**. Lo pendiente deja de sumar a tu patrimonio y no se crea un gasto.",
        "Para corregir datos toca el lápiz de **Editar préstamo** y luego **Guardar cambios**. El monto no puede quedar por debajo de lo ya recuperado.",
      ],
    },
    {
      title: "Debo: registrar una deuda",
      text: "Úsalo cuando alguien te prestó o pagó algo por ti. El formulario está en **Nueva deuda**.",
      steps: [
        "Escribe **¿A quién le debes?** y **¿Cuánto? (USD)**.",
        "Revisa la **Fecha** y, si quieres, **¿Para cuándo quieres terminar de pagar? (opcional)** y una **Nota (opcional)**.",
        "Toca **Registrar deuda**.",
        "Cada vez que pagues, abre **Registrar abono** en la tarjeta, elige **¿De qué cuenta sale el abono?** y toca **Registrar abono**.",
      ],
    },
    {
      title: "Filtrar y ordenar",
      steps: [
        "En **Ver** elige **Pendientes**, **Activos sin abonos**, **Parciales** o **Pagados**.",
        "En **Ordenar por** elige **Más recientes**, **Más antiguos**, **Mayor monto** o **Menor monto**.",
        "Toca **Aplicar**.",
      ],
      tips: [
        "Los totales de arriba muestran lo prestado, lo recuperado y lo **Pendiente por cobrar**; en **Debo** muestran **Me prestaron**, **Abonado** y **Pendiente por pagar**.",
        "Una tarjeta con borde rojo y estado **Vencido** ya pasó su fecha esperada de pago.",
        "Con **Descargar CSV** o **Descargar Excel** bajas la lista.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Registrar una deuda en **Debo** no cuenta como gasto ni mueve tus saldos; solo cada abono sale de la cuenta que elijas.",
        "Lo que debes resta de tu patrimonio y lo que te deben suma, hasta que se paga o se cierra como incobrable.",
        "Los abonos que recibes no cuentan como ingreso, y los que haces no cuentan como gasto.",
        "Para registrar préstamos o abonos necesitas permiso de edición en Préstamos y en Movimientos. Para crear deudas basta el permiso de edición en Préstamos.",
      ],
    },
  ],
} satisfies Manual;
