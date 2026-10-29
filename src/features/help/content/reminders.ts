import type { Manual } from "../types";

export default {
  title: "Recordatorios",
  summary:
    "Anota lo que no quieres olvidar (pagos, citas, vacunas, mantenimiento del carro) y guarda el historial de lo que ya hiciste.",
  sections: [
    {
      title: "Recordar algo",
      steps: [
        "Toca **Nuevo** y deja seleccionado **Recordar algo**.",
        "Escribe **¿Qué quieres recordar?** y elige la **Fecha**.",
        "En **Se repite** elige **No se repite**, **Cada semana**, **Cada mes**, **Cada 3 meses**, **Cada 6 meses**, **Cada año** o **Personalizado…**.",
        "En **Avisarme** marca **El mismo día**, **1 día antes** o **1 semana antes**.",
        "Elige la **Categoría** y, si quieres que tu pareja lo vea, marca **Compartir con el hogar**.",
        "Toca **Guardar**.",
      ],
      tips: [
        "Marca **Sin fecha (solo una nota)** para guardar una nota sin aviso.",
        "En **Más opciones** tienes **Notas**, **Referencia**, **Hora** y **La próxima fecha se cuenta desde** (**Cuando lo realice** o **La fecha fija del calendario**).",
      ],
    },
    {
      title: "Ya lo hice",
      text: "Para registrar algo que acabas de hacer y, si quieres, que te lo recuerde la próxima vez.",
      steps: [
        "Toca **Nuevo** y cambia a **Ya lo hice**.",
        "Escribe **¿Qué hiciste?** y elige **¿Cuándo?**: **Hoy**, **Ayer** u otra fecha.",
        "En **¿Te lo recuerdo la próxima vez?** elige cada cuánto en **Repetir**, o **No me lo recuerdes**.",
        "Toca **Guardar**. Verás la **Próxima vez** calculada antes de guardar.",
      ],
      tips: [
        "Para cosas comunes, como cambio de aceite o vacunas, la app sugiere un intervalo y la categoría.",
      ],
    },
    {
      title: "Marcar como hecho y kilometraje",
      steps: [
        "En la tarjeta toca **Hecho**.",
        "Revisa **¿Cuándo lo hiciste?** y agrega **Observaciones** si quieres.",
        "Si el recordatorio sigue kilometraje, escribe el **Kilometraje de hoy en el tablero**.",
        "Toca **Guardar realización**. Si se repite, verás la **Próxima vez** por fecha o por kilómetros.",
      ],
      tips: [
        "Para seguir por kilometraje activa **Seguir también por kilometraje** y llena **Lectura actual (km)**, **Avisar a los (km)** y **Repetir cada (km)**.",
        "La app no mide el uso del vehículo: tú actualizas la lectura a mano. Si la tarjeta dice **actualiza los km**, falta una lectura.",
      ],
    },
    {
      title: "Ver, buscar y organizar",
      tips: [
        "**Próximos** agrupa en **Vencidos**, **Hoy**, **Esta semana**, **Más adelante** y **Sin fecha**.",
        "**Calendario** marca los días con pendientes; toca un día para ver sus recordatorios.",
        "Usa la búsqueda por título o referencia y los chips de categoría para filtrar.",
        "En el menú de cada tarjeta tienes **Posponer**, **Editar**, **Pausar** o **Reanudar**, y **Archivar** o **Restaurar**.",
        "Toca el título para ver el detalle y su historial.",
      ],
    },
    {
      title: "Menú ⋯",
      tips: [
        "En **Ver** abres **Historial de realizados**, **Pausados** y **Archivados**.",
        "En **Descargar** bajas **Recordatorios** o **Historial** en CSV o Excel.",
        "**Administrar categorías** te deja crear, editar o archivar categorías.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Si no marcas **Compartir con el hogar**, el recordatorio es solo tuyo: nadie más lo ve, ni el administrador. Lo marca un candado.",
        "Solo quien creó un recordatorio puede cambiar su privacidad.",
        "**Posponer** cambia solo esta ocasión; el calendario de repetición se conserva.",
        "Archivar o pausar no borra nada: el registro y su historial se conservan.",
      ],
    },
  ],
} satisfies Manual;
