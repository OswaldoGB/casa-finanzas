import type { Manual } from "../types";

export default {
  title: "Presupuestos",
  summary:
    "Dale un destino a tu dinero: define cuánto puedes gastar al mes en cada categoría y mira cuánto llevas.",
  sections: [
    {
      title: "Crear un presupuesto",
      steps: [
        "En **Nuevo presupuesto**, elige la **Categoría** de gasto.",
        "Escribe el **Presupuesto base (USD)**: lo que quieres gastar este mes.",
        "Marca **Arrastrar el sobrante del mes anterior** si quieres sumar lo que no gastaste el mes pasado.",
        "Toca **Crear presupuesto**.",
      ],
      tips: [
        "Cada categoría tiene un solo presupuesto por mes. Si todas ya tienen uno, edita los existentes o crea categorías en Configuración.",
        "Las subcategorías aparecen con una flecha y tienen su propio presupuesto.",
      ],
    },
    {
      title: "Planificar otro mes",
      steps: [
        "En **Mes** elige el mes y toca **Ver mes**.",
        "Toca **Copiar mes anterior** para traer los presupuestos del mes pasado.",
        "Ajusta los montos que necesites.",
      ],
      tips: [
        "Al copiar, los presupuestos que ya existan en el mes se conservan.",
      ],
    },
    {
      title: "Leer tu avance",
      text: "Arriba verás **Disponible con arrastre**, **Gastado en estas categorías** y **Por gastar**. Cada presupuesto muestra su porcentaje usado, lo gastado y lo que **Quedan** o el **Exceso**.",
      tips: [
        "La barra se pone amarilla desde el 70% y roja desde el 90%.",
        "Debajo verás la **Base** y, si aplica, el **sobrante** arrastrado del mes anterior.",
        "Los presupuestos al 90% o más también aparecen en **Lo importante ahora** de Inicio.",
      ],
    },
    {
      title: "Editar o eliminar",
      steps: [
        "Abre **Editar presupuesto** en la categoría.",
        "Cambia el monto o el arrastre y toca **Guardar cambios**.",
        "Para quitarlo, toca **Eliminar presupuesto** y confirma.",
      ],
      tips: ["Eliminar un presupuesto no borra tus movimientos."],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Solo cuentan los gastos confirmados de esa categoría exacta. Los pendientes no suman.",
        "El arrastre solo suma lo que quedó sin gastar; un exceso no se arrastra.",
        "Solo puedes crear o editar presupuestos si tienes permiso de edición.",
      ],
    },
  ],
} satisfies Manual;
