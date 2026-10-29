import type { Manual } from "../types";

export default {
  title: "Proyectos",
  summary:
    "Planea los proyectos del hogar, como una remodelación, con un presupuesto, y mira cuánto cuestan de verdad según sus gastos.",
  sections: [
    {
      title: "Crear un proyecto",
      steps: [
        "En el panel **Nuevo proyecto**, escribe el **Nombre** y una **Descripción** si quieres.",
        "Anota el **Presupuesto ($)**.",
        "Elige el **Estado**: **Planeado**, **En marcha**, **Terminado** o **Archivado**.",
        "Opcional: indica las fechas de **Inicio** y **Final**.",
        "Toca **Guardar**.",
      ],
    },
    {
      title: "Sumar gastos al proyecto",
      text: "El proyecto no registra pagos por sí mismo. Suma los gastos que vinculas desde otras pantallas.",
      steps: [
        "Ve a Movimientos y crea o edita un gasto.",
        "En **Proyecto opcional**, elige el proyecto.",
        "Guarda el movimiento. Aparece en **Gastos vinculados** del proyecto.",
      ],
      tips: [
        "También puedes vincular una lista de compra con **Vincular a viaje o proyecto**; sus compras cuentan en el gasto del proyecto.",
      ],
    },
    {
      title: "Seguir el avance",
      tips: [
        "Cada tarjeta muestra lo gastado frente al presupuesto, con una barra de avance.",
        "Verás **Disponible** con lo que queda, o **Excedido** en rojo si te pasaste.",
        "Dentro del proyecto ves **Presupuesto**, **Gasto confirmado** y **Disponible**, más la lista de gastos.",
        "Los viajes también aparecen aquí; al tocarlos se abren en Viajes.",
        "Usa **Descargar CSV** o **Descargar Excel** para exportar tus proyectos.",
      ],
    },
    {
      title: "Editar o eliminar",
      steps: [
        "Abre el proyecto y cambia los datos en **Editar proyecto**.",
        "Toca **Guardar**.",
        "Para borrarlo, toca **Eliminar proyecto** y confirma.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Solo se suman gastos confirmados.",
        "Si el proyecto tiene movimientos vinculados, mejor cámbialo a **Archivado** en lugar de eliminarlo; así conservas su historial.",
        "Los proyectos archivados ya no aparecen al elegir proyecto en un movimiento nuevo.",
      ],
    },
  ],
} satisfies Manual;
