import type { Manual } from "../types";

export default {
  title: "Movimientos",
  summary:
    "Aquí registras y consultas los ingresos, gastos y transferencias del hogar, agrupados por día.",
  sections: [
    {
      title: "Registrar un gasto o ingreso",
      steps: [
        "Toca **Nuevo movimiento**.",
        "Escribe el **Monto (USD)** y elige el **Tipo**: **Gasto**, **Ingreso** o **Transferencia**.",
        "Revisa la **Fecha** (por defecto es hoy).",
        "Elige la **Cuenta**. El **Método de pago** se llena solo: tarjeta de crédito pone Tarjeta de crédito, cuenta bancaria pone Transferencia bancaria y efectivo pone Efectivo. Si la cuenta tiene un método ligado, se usa ese.",
        "Elige la **Categoría** y, si quieres, una **Descripción**, un **Proyecto opcional** y **Notas**.",
        "Toca **Guardar movimiento**.",
      ],
      tips: [
        "En la lista de cuentas las tarjetas de crédito aparecen primero.",
        "Puedes cambiar el método de pago que se eligió solo.",
        "El formulario recuerda la última cuenta, categoría y método que usaste.",
        "En computadora, el botón redondo **+** abre el **Registro rápido**, con solo los campos básicos.",
      ],
    },
    {
      title: "Mover dinero entre tus cuentas",
      steps: [
        "En **Nuevo movimiento** elige el **Tipo** **Transferencia**.",
        "Elige la **Cuenta origen** y la **Cuenta destino**.",
        "Escribe el monto y toca **Guardar movimiento**.",
      ],
      tips: [
        "Una transferencia no es ingreso ni gasto: solo cambia el dinero de lugar.",
        "Para pagar una tarjeta usa **Pagar este corte** desde su detalle en **Billetera**, así el pago se aplica al corte correcto.",
      ],
    },
    {
      title: "Buscar y filtrar",
      text: "Usa los filtros **Desde**, **Hasta**, **Tipo**, **Cuenta**, **Categoría**, **Método**, **Usuario**, **Proyecto** y **Buscar** (por descripción). Luego toca **Aplicar filtros**.",
      tips: [
        "Cada día muestra sus ingresos y gastos confirmados.",
        "Se muestran como máximo los 500 movimientos más recientes; acota las fechas para ver otros.",
        "Con **Descargar CSV** o **Descargar Excel** exportas los movimientos.",
      ],
    },
    {
      title: "Editar, borrar y adjuntar comprobantes",
      steps: [
        "Toca el lápiz junto al monto (o abre el movimiento y toca **Editar movimiento**). Cambia los datos y toca **Guardar cambios**.",
        "Para borrar, abre el movimiento, toca **Borrar** y confirma con **Borrar movimiento**.",
        "En el detalle, sección **Comprobantes**, toca **Adjuntar** para subir una foto o PDF del recibo.",
      ],
      tips: [
        "Para varios a la vez, marca las casillas de los movimientos (hasta 100). Luego elige una **Nueva categoría** y toca **Cambiar categoría**, o toca **Borrar seleccionados**.",
        "Borrar un movimiento también borra sus comprobantes y no se puede deshacer.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Los movimientos **Pendiente** vienen de recurrentes que necesitan confirmación. Toca **Confirmar** para que cuenten en tus saldos; antes no se pueden editar.",
        "Los movimientos que forman parte de un pago de tarjeta no se editan aquí: corrige el pago completo desde el **Historial** de la tarjeta.",
        "Los montos siempre se escriben en positivo; el tipo decide si suma o resta.",
        "Solo puedes registrar o editar si tienes permiso de edición en Movimientos.",
      ],
    },
  ],
} satisfies Manual;
