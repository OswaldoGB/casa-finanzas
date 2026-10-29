import type { Manual } from "../types";

export default {
  title: "Configuración",
  summary:
    "Gestiona tu hogar y decide a qué puede acceder cada persona. También administras categorías, métodos de pago, movimientos recurrentes y descargas. Solo el administrador ve esta pantalla.",
  sections: [
    {
      title: "Hogar y miembros",
      steps: [
        "En **Hogar** cambia el **Nombre del hogar** o la **Zona horaria** y toca **Guardar hogar**.",
        "En **Miembros**, si aún no has agregado a tu pareja, llena **Nombre**, **Correo** y **Contraseña inicial** en **Agregar a tu pareja** y toca **Crear miembro**.",
        "Comparte su contraseña de forma privada y luego asigna sus permisos.",
      ],
      tips: [
        "La zona horaria define el día local para próximos pagos y movimientos.",
        "El hogar admite dos personas: administrador y miembro.",
      ],
    },
    {
      title: "Permisos",
      text: "En **Permisos de** tu pareja eliges, para cada módulo, **Sin acceso**, **Ver** o **Editar**.",
      steps: [
        "Marca el nivel de cada módulo.",
        "Toca **Guardar permisos**.",
      ],
      tips: [
        "**Ver** permite solo lectura. **Editar** permite crear, cambiar y borrar.",
        "Un miembro nuevo empieza sin acceso a ningún módulo.",
        "Algunas acciones piden permiso en dos módulos; por ejemplo, registrar abonos de préstamos también pide **Editar** en Movimientos.",
      ],
    },
    {
      title: "Categorías y métodos de pago",
      steps: [
        "Toca **Nueva categoría**, llena **Nombre**, **Tipo** (**Gasto** o **Ingreso**), **Categoría principal** si es subcategoría, **Color** e **Ícono**, y toca **Crear categoría**.",
        "Para cambiar una, ábrela, edítala y toca **Guardar cambios**. Si ya no la usas, toca **Archivar categoría**.",
        "Para ordenarlas, arrastra el ícono o usa **↑ Subir** y **↓ Bajar** al abrirlas.",
        "En **Métodos de pago** toca **Nuevo método de pago**, elige el **Tipo** y, si quieres, una **Cuenta vinculada**; luego **Crear método**.",
      ],
      tips: [
        "Solo puedes ordenar categorías del mismo tipo y nivel.",
        "Vincular un método a una cuenta agiliza el registro de movimientos.",
      ],
    },
    {
      title: "Movimientos recurrentes",
      steps: [
        "Abre **Crear recurrente**.",
        "Llena **Nombre**, **Monto USD**, **Tipo**, la cuenta, la **Categoría** y el **Método de pago**.",
        "Elige **Frecuencia** (**Semanal**, **Quincenal**, **Mensual** o **Anual**) y **Cada cuántos períodos**.",
        "En **Registro** elige **Pendiente de confirmar** o **Automático**.",
        "Pon el **Inicio** y, si quieres, **Fin (opcional)**. Toca **Crear recurrente**.",
      ],
      tips: [
        "Los automáticos se registran al vencer; los demás quedan pendientes de confirmar.",
        "Cada recurrente muestra su próxima fecha y si está **Activo** o **Inactivo**. Ábrelo para editarlo, **Desactivar** o **Eliminar**.",
      ],
    },
    {
      title: "Descargas y respaldo",
      tips: [
        "**Descargar respaldo JSON** guarda los registros y permisos del hogar.",
        "Elige el **Mes del reporte** y toca **Descargar reporte mensual Excel**. Movimientos, presupuestos y gastos por categoría son de ese mes; las demás hojas muestran el estado actual.",
        "En **Descargar catálogos y recurrentes** bajas categorías, métodos de pago y recurrentes en CSV o Excel.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Tú, como administrador, siempre tienes acceso completo; los permisos solo aplican a tu pareja.",
        "Los recordatorios personales de tu pareja no se ven aunque seas administrador.",
        "El respaldo no incluye contraseñas, y las fotos y comprobantes se conservan por separado.",
        "Eliminar un recurrente no se puede deshacer: ya no se crearán más movimientos programados. Si quieres que deje de generar movimientos sin borrarlo, usa **Desactivar**.",
        "Archivar una categoría o un método conserva sus registros.",
      ],
    },
  ],
} satisfies Manual;
