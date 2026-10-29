import type { Manual } from "../types";

export default {
  title: "Compras próximas",
  summary:
    "Anota los deseos y las compras grandes del hogar, ordénalas por prioridad y registra el gasto cuando por fin las compres.",
  sections: [
    {
      title: "Agregar una compra",
      steps: [
        "En el panel **Nueva compra**, escribe el **Nombre**.",
        "Si lo sabes, anota el **Precio estimado ($)**.",
        "Elige la **Prioridad**: **Alta**, **Media** o **Baja**.",
        "Opcional: indica una **Fecha objetivo**, un **Enlace** al producto y **Notas**.",
        "Toca **Guardar**.",
      ],
      tips: [
        "Si agregaste un enlace, la tarjeta muestra **Ver producto** para abrirlo.",
      ],
    },
    {
      title: "Revisar y ordenar",
      text: "Usa las pestañas **Pendiente**, **Comprado** y **Descartado** para ver cada grupo. Arriba ves el **Estimado de compras pendientes** y cuántas no tienen precio.",
      steps: [
        "Toca **Editar / cambiar prioridad** en la compra que quieras ajustar.",
        "Cambia los datos en el panel **Editar compra** y toca **Guardar**.",
        "Para dejarla de lado, cambia el **Estado** a **Descartado**. Puedes regresarla a **Pendiente** cuando quieras.",
      ],
      tips: [
        "Toca **Cancelar / nueva compra** para salir de la edición sin cambios.",
      ],
    },
    {
      title: "Registrar que ya lo compraste",
      steps: [
        "En una compra pendiente, toca **Ya lo compré**.",
        "Escribe el **Precio pagado ($, impuesto incluido)** y la **Fecha**.",
        "Elige **Cuenta**, **Categoría** y, si quieres, **Método**.",
        "Marca **Agregar también al inventario** si quieres llevar control del artículo en casa.",
        "Toca **Registrar compra y gasto**.",
      ],
      tips: [
        "La compra pasa a **Comprado** y muestra **Ver gasto / recibo** para adjuntar el comprobante.",
        "Si la agregaste al inventario, verás también **Ver inventario**.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Los precios estimados no afectan tus saldos. Solo **Registrar compra y gasto** crea un gasto confirmado en Movimientos.",
        "Una compra marcada como **Comprado** ya no se puede editar ni reabrir.",
        "**Eliminar** quita la compra de la lista, pero su gasto, si existe, se conserva en Movimientos.",
        "Para registrar el gasto necesitas permiso de editar Movimientos; para agregarlo al inventario, permiso de editar Inventario.",
        "El estimado de pendientes suma el precio de cada compra tal cual, sin cantidades.",
      ],
    },
  ],
} satisfies Manual;
