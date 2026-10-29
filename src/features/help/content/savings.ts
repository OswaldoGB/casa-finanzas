import type { Manual } from "../types";

export default {
  title: "Ahorros",
  summary:
    "Aparta dinero para tus metas (viaje, carro) y para compras que ya sabes que vendrán, con reservas que te dicen cuánto apartar cada quincena o cada mes.",
  sections: [
    {
      title: "Crear una meta o reserva",
      text: "El formulario está en **Nueva meta o reserva**.",
      steps: [
        "Escribe el **Nombre**.",
        "En **Tipo** elige **Meta de ahorro (viaje, carro…)** o **Reserva para una compra que se repite**.",
        "Si es reserva, elige **¿Cada cuándo apartas?**: **Cada quincena (15 y fin de mes)**, **Cada mes (fin de mes)** o **Sin calendario, cuando yo quiera**.",
        "Escribe el **Objetivo (USD)** y la fecha. En una reserva con calendario la fecha es obligatoria: **¿Para cuándo lo vas a necesitar?**",
        "En **Dónde apartas el dinero** deja **Apartado virtual** o elige una cuenta.",
        "Elige **Color** e **Ícono** y toca **Crear meta o provisión**.",
      ],
    },
    {
      title: "Aportar o retirar",
      steps: [
        "En la tarjeta abre **Aportar o retirar**.",
        "En **Operación** elige **Aportar** o **Retirar**, escribe el **Monto (USD)** y la **Fecha**.",
        "Si la meta está ligada a una cuenta, elige la **Otra cuenta (origen al aportar / destino al retirar)**.",
        "Toca **Registrar operación**.",
      ],
      tips: [
        "Con apartado virtual solo cambia lo apartado; los saldos de tus cuentas no se mueven.",
        "Con cuenta vinculada se registra una transferencia, y no puedes retirar más de lo aportado.",
      ],
    },
    {
      title: "Reservas por quincena",
      text: "La app reparte lo que falta entre los días de pago que quedan hasta la fecha que pusiste y te dice cuánto apartar cada vez.",
      tips: [
        "Cuando toca, la tarjeta dice **Te toca apartar** con el monto de esta quincena o de este mes.",
        "Si ya apartaste en este período, verás **Al día** y la fecha del próximo aporte.",
        "En **Inicio**, el aviso **Reservas de esta quincena** te deja apartar el monto sugerido con el botón **Apartar**; puedes ajustar el monto antes.",
        "Las metas sin calendario muestran un **Aporte sugerido** al mes si tienen fecha objetivo.",
      ],
    },
    {
      title: "Ya lo compré",
      text: "Cuando haces la compra para la que reservabas, liga el gasto y la reserva vuelve a empezar.",
      steps: [
        "Registra primero el gasto en **Movimientos**.",
        "En la tarjeta de la reserva abre **Ya lo compré**.",
        "Busca el gasto por descripción o monto en **¿Cuál fue el gasto de la compra?** y selecciónalo.",
        "Toca **Ya lo compré**. Lo apartado se usa para esa compra y la reserva vuelve a $0, con la misma duración si tiene calendario.",
      ],
      tips: [
        "Sin escribir nada ves los gastos más recientes; al escribir busca en todo tu historial.",
      ],
    },
    {
      title: "Editar o eliminar",
      steps: [
        "Abre **Editar meta**, cambia lo que necesites y toca **Guardar cambios**.",
        "Para borrarla usa **Eliminar meta sin movimientos** y confirma con **Eliminar meta**.",
      ],
      tips: [
        "Solo se pueden eliminar metas que no tengan movimientos.",
        "La cuenta y el tipo quedan fijos una vez que registras movimientos.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "Un **Apartado virtual** no saca dinero de tu cuenta: es una marca sobre dinero que sigue en tus cuentas. Arriba se indica cuánto tienes reservado dentro de ellas.",
        "La quincena son los días 15 y el último día de cada mes; la cadencia mensual es solo el último día del mes.",
        "Si no te alcanza a una quincena, el monto se recalcula: lo que falta se reparte entre los días de pago que quedan.",
      ],
    },
  ],
} satisfies Manual;
