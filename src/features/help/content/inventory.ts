import type { Manual } from "../types";

export default {
  title: "Inventario",
  summary:
    "Registra lo que tienes en casa, dónde está, cuánto costó y hasta cuándo dura su garantía.",
  sections: [
    {
      title: "Agregar un artículo",
      steps: [
        "En el panel **Nuevo artículo**, escribe el **Nombre**.",
        "Indica la **Ubicación / habitación** y la **Categoría**, por ejemplo Cocina y Electrodomésticos.",
        "Anota la **Cantidad** y el **Precio por unidad ($)**.",
        "Opcional: **Fecha de compra**, **Garantía hasta**, **Estado** y **Notas**.",
        "Si el artículo ya está registrado como gasto, elígelo en **Gasto vinculado (opcional)**.",
        "Toca **Guardar**.",
      ],
    },
    {
      title: "Agregar una foto",
      text: "La foto se agrega una vez guardado el artículo.",
      steps: [
        "Abre el artículo desde la lista.",
        "En **Agregar o cambiar foto**, elige una imagen JPG, PNG o WebP de hasta 20 MB.",
        "Espera a que termine **Subiendo foto…**. La foto aparece en el detalle y en la tarjeta.",
      ],
    },
    {
      title: "Buscar y revisar",
      steps: [
        "Usa **Ubicación** para ver solo lo de una habitación, o **Todas**.",
        "En **Vista** elige **Tarjetas** o **Tabla**.",
        "Toca **Aplicar**.",
      ],
      tips: [
        "Arriba ves el **Valor registrado**, el total de **Artículos** y las **Garantías por vencer (30 días)**.",
        "Las garantías que vencen en los próximos 30 días se marcan como **Por vencer**.",
        "Usa **Descargar CSV** o **Descargar Excel** para exportar el inventario.",
      ],
    },
    {
      title: "Editar o eliminar",
      steps: [
        "Abre el artículo y cambia los datos en **Editar artículo**.",
        "Toca **Guardar**.",
        "Para borrarlo, toca **Eliminar artículo** y confirma. También se borra su foto.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Registrar inventario no crea un gasto ni cambia tus saldos. Vincular un gasto solo lo relaciona.",
        "El valor es cantidad por precio de compra. Los artículos sin precio no se suman.",
        "El inventario no forma parte de tu patrimonio financiero.",
        "Desde **Compras próximas**, al marcar **Ya lo compré**, puedes agregar el artículo aquí automáticamente.",
      ],
    },
  ],
} satisfies Manual;
