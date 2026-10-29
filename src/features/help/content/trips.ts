import type { Manual } from "../types";

export default {
  title: "Viajes",
  summary:
    "Planeen juntos los días, el menú, las compras y el presupuesto de un viaje, y comparen lo estimado con lo que realmente gastan.",
  sections: [
    {
      title: "Crear un viaje",
      steps: [
        "Toca **Nuevo viaje**.",
        "Escribe el **Nombre del viaje** y el **Destino**.",
        "Elige las fechas de **Inicio** y **Final**.",
        "Anota el **Presupuesto máximo (USD)**, **Quiénes van**, el **Estado** y unas **Notas** si quieres.",
        "Toca **Guardar**. Se abre el plan del viaje.",
      ],
      tips: [
        "Para cambiar estos datos, toca **Editar viaje** dentro del viaje.",
        "Usa **Tus viajes** y **Archivados** para cambiar de vista. Un viaje se archiva cambiando su **Estado** a **Archivado**.",
      ],
    },
    {
      title: "Planear día por día",
      text: "En la pestaña **Por día** ves cada fecha del viaje, una semana a la vez. Usa **Anterior** y **Siguiente** para moverte.",
      steps: [
        "En el día que quieras, toca **Agregar actividad**.",
        "Escribe **Qué planean**, el **Día**, la **Hora (opcional)**, el **Tipo** (Desayuno, Almuerzo, Cena, Snacks, Salida, Experiencia u Otro), el **Lugar** y **Notas**.",
        "Toca **Guardar**.",
        "Para sumar ingredientes o cosas que necesitan, toca **Añadir producto**. Elige uno de la lista o **Crear producto nuevo**, e indica la **Cantidad necesaria para esta actividad**.",
        "Si la actividad tiene un costo, como una entrada o un tour, toca **Añadir costo**.",
      ],
      tips: [
        "Un producto se comparte entre actividades. Si la suma de lo requerido supera lo que hay en la lista, la app avisa cuánto falta cubrir.",
        "Marca **Actualizar la cantidad de la lista con la suma de lo requerido para todas las actividades** para ajustar la lista automáticamente.",
        "**Quitar actividad** y **Desvincular producto** solo la quitan del plan.",
      ],
    },
    {
      title: "Presupuestar y pagar costos",
      text: "En la pestaña **Presupuesto** agregas alojamiento, transporte y otros costos. Los productos ya cuentan desde sus listas.",
      steps: [
        "Toca **Añadir costo** y escribe el **Concepto**, la **Cantidad**, la **Unidad** y el **Precio estimado por unidad (USD)**.",
        "Si aplica, elige una **Actividad (opcional)** y una **Categoría (opcional)**. Toca **Guardar**.",
        "Cuando pagues, toca **Registrar pago**. Indica **Monto del pago (USD)**, **Cuenta o tarjeta**, **Categoría de gasto**, **Método de pago** y **Fecha**.",
        "Si es un anticipo, desmarca **Este pago completa el concepto**. Toca **Guardar**.",
        "Si el gasto ya estaba registrado, toca **Ya está en Movimientos** y elige el movimiento para vincularlo.",
      ],
      tips: [
        "Cada concepto muestra **Estimado**, **Real**, **Previsto pendiente** y **Diferencia**, y su estado: **Planeado**, **Pago parcial** o **Completado**.",
        "En **Otros gastos del viaje** ves gastos ligados al viaje que aún no tienen concepto. Ya cuentan en el total real.",
      ],
    },
    {
      title: "Compras del viaje",
      text: "En la pestaña **Compras** manejas las listas de compra del viaje, con los mismos lugares, carrito y pagos de Listas de compra.",
      steps: [
        "Si el viaje aún no tiene lista, toca **Crear lista del viaje**.",
        "Para usar una lista que ya tienes, abre **Vincular una lista que ya existe**, elígela y toca **Vincular lista**.",
        "Para verla completa, toca **Abrir lista**.",
      ],
    },
    {
      title: "Ver cómo va el viaje",
      text: "La pestaña **Resumen** muestra **Presupuesto máximo**, **Costo estimado**, **Gasto real**, **Previsto pendiente**, **Proyección final** y **Margen disponible**.",
      tips: [
        "La barra **Cómo va el presupuesto** indica qué porcentaje del máximo ya está previsto.",
        "Si hay precios sin definir, la app avisa que el estimado y la proyección están incompletos.",
        "Al terminar de pagar todo, verás si hubo **Sobrecosto** o **Ahorro frente al estimado**.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "**Registrar pago** y **Confirmar compra** crean un gasto real en Movimientos. **Ya está en Movimientos** no crea otro gasto ni cambia tu saldo.",
        "La proyección combina lo ya pagado con lo previsto que falta. No son cargos nuevos.",
        "El gasto real incluye anticipos pagados antes de salir. Cada gasto también cuenta en su categoría y mes, sin duplicarse.",
        "Quitar actividades, productos o conceptos no borra los movimientos ni los productos comprados.",
      ],
    },
  ],
} satisfies Manual;
