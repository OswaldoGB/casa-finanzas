import type { Manual } from "../types";

export default {
  title: "Listas de compra",
  summary:
    "Arma la lista del súper o de cualquier tienda, compártela con tu hogar en tiempo real y conoce el total antes de llegar a caja.",
  sections: [
    {
      title: "Crear una lista",
      steps: [
        "Toca **Nueva lista** (o **Crear la primera lista** si aún no tienes ninguna).",
        "Escribe el **Nombre**, por ejemplo Súper semanal.",
        "Si quieres, indica la **Tienda (opcional)** y un **Tope de compra (USD, opcional)**.",
        "Toca **Crear lista**. Se abre la lista lista para agregar artículos.",
      ],
      tips: [
        "Si escribes una tienda, se crea automáticamente un lugar con ese nombre dentro de la lista.",
        "Mientras la lista esté abierta puedes cambiar estos datos en **Editar nombre, tienda y tope**.",
      ],
    },
    {
      title: "Agregar artículos y lugares",
      text: "Los lugares son las tiendas donde vas a comprar. Cada artículo se agrupa en su lugar o en **Por decidir**.",
      steps: [
        "Para sumar una tienda, escribe su nombre en **Nuevo lugar** y toca **Agregar lugar**.",
        "En el panel **Agregar artículo**, elige **Dónde comprar**, escribe el **Artículo**, la **Cantidad** y la **Unidad**.",
        "Anota el **Precio estimado** por unidad, con impuesto incluido, y unas **Notas** si hace falta.",
        "Toca **Agregar artículo**.",
      ],
      tips: [
        "Al escribir el nombre aparecen sugerencias con el último precio pagado; si eliges una, se llena el precio estimado.",
        "Para corregir algo, abre **Editar artículo y lugar** dentro del artículo. Ahí también está **Eliminar artículo**.",
        "**Cambiar nombre del lugar** y **Archivar lugar · mover pendientes** están al final de cada lugar. Al archivarlo, sus pendientes pasan a **Por decidir**.",
      ],
    },
    {
      title: "Ir de compras",
      steps: [
        "Marca la casilla de cada artículo cuando lo metas al carrito; queda como **En carrito**.",
        "Escribe el **Precio real c/u** que ves en la tienda. Se guarda al salir del campo.",
        "Si algo ya lo tienen en casa, toca **Ya lo tenemos**. Si decides no llevarlo, toca **No comprar**.",
        "Para deshacer cualquiera de esas dos opciones, toca **Volver a pendientes**.",
      ],
      tips: [
        "Arriba ves cuatro totales: **Pagado**, **En carrito**, **Pendiente estimado** y **Proyección**.",
        "Si pusiste un tope, verás el **Margen**; se pone en rojo cuando la proyección lo supera.",
        "Si faltan precios, la app te avisa que la proyección aún está incompleta.",
      ],
    },
    {
      title: "Registrar la compra",
      text: "Cada lugar se paga por separado. Solo se cobran los artículos que están en el carrito de ese lugar; los demás siguen pendientes.",
      steps: [
        "Cuando todos los artículos del carrito tengan precio real, toca **Registrar compra** con el total de ese lugar.",
        "Revisa el detalle y elige **Cuenta o tarjeta**, **Categoría de gasto**, **Método de pago** y **Fecha**.",
        "Toca **Confirmar compra**.",
      ],
      tips: [
        "La compra aparece en **Compras registradas**, con el enlace **Ver movimiento y comprobante** para adjuntar el recibo.",
        "Para registrar compras necesitas permiso de Movimientos.",
      ],
    },
    {
      title: "Duplicar, archivar y vincular",
      tips: [
        "**Duplicar lista** crea una copia con los mismos lugares y artículos, usando el último precio real como estimado. Ideal para el súper de cada semana.",
        "**Archivar** guarda la lista para consulta y la saca de uso.",
        "Con **Vincular a viaje o proyecto** las compras de la lista cuentan en el gasto real de ese proyecto, sin crear movimientos extra.",
        "Usa **Descargar CSV** o **Descargar Excel** para exportar tus listas o los artículos de una lista.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "**Confirmar compra** crea un gasto real en Movimientos y descuenta el saldo de la cuenta elegida. Los precios estimados no afectan tus saldos.",
        "La lista se comparte en tiempo real: si ves **Compartida en tiempo real**, los cambios de los demás aparecen solos. Si no, toca **Actualizar**.",
        "Cuando ya no quedan artículos pendientes, la lista pasa sola a **Compra terminada**. Con **Reabrir y agregar artículos** puedes seguir; las compras pagadas se conservan.",
        "Los artículos ya pagados no se pueden editar ni desmarcar.",
      ],
    },
  ],
} satisfies Manual;
