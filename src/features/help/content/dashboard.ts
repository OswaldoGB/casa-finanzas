import type { Manual } from "../types";

export default {
  title: "Inicio",
  summary:
    "Tu hogar de un vistazo: saldos, ingresos y gastos del mes, lo que merece atención hoy y lo que viene en los próximos 14 días.",
  sections: [
    {
      title: "Las cifras de arriba",
      text: "Las tres tarjetas superiores resumen tu situación actual.",
      tips: [
        "**Patrimonio neto**: tus cuentas menos lo que debes en tarjetas, más los préstamos por cobrar (lo que tú debes resta).",
        "**Ingresos del mes** y **Gastos del mes**: solo cuentan movimientos publicados; los pendientes no suman hasta confirmarse.",
        "Debajo de los gastos verás el **Balance del mes**: en verde si ingresó más de lo que gastaste, en rojo si no.",
      ],
    },
    {
      title: "Lo importante ahora",
      text: "Esta sección junta lo que merece una mirada hoy. Toca cualquier aviso para ir a la pantalla donde lo resuelves.",
      tips: [
        "Préstamos vencidos que aún te deben: te lleva a **Préstamos**.",
        "Presupuestos al límite (90% o más de lo disponible): te lleva a **Presupuestos**.",
        "**El saldo previsto se vuelve negativo** o pagos próximos: te lleva a **Proyecciones**.",
        "Si no hay nada pendiente verás **Todo al día**.",
      ],
    },
    {
      title: "Presupuestos, préstamos y metas",
      tips: [
        "**Presupuestos del mes** muestra cuánto llevas gastado de cada uno y el porcentaje utilizado. Usa **Ver todos** para ir al detalle.",
        "**Préstamos por cobrar** muestra el total pendiente y los préstamos más importantes; los vencidos aparecen marcados.",
        "En **Metas y reservas**, cuando a una reserva le toca aporte en esta quincena aparece **Reservas de esta quincena**. Revisa el monto y toca **Apartar** para registrarlo sin salir de Inicio.",
        "**Por recordar** lista tus próximos recordatorios activos (si tienes acceso a Recordatorios).",
      ],
    },
    {
      title: "Lo que viene",
      tips: [
        "**Próximos 14 días** lista los recurrentes programados y los pagos de tarjeta que vencen pronto.",
        "**Disponible después de lo programado** calcula cuánto te quedaría en efectivo y bancos tras esos movimientos. Si en algún día queda en negativo, verás un aviso en rojo.",
        "**Ingresos y gastos** muestra la tendencia de los últimos 12 meses. Abre **Ver datos por mes** para ver la tabla con los montos.",
        "**Tu billetera** muestra tus cuentas, lo **Disponible** y la deuda de **Tarjetas**. Usa **Ver billetera** para ir al detalle.",
      ],
    },
    {
      title: "Ten en cuenta",
      tips: [
        "El saldo previsto solo incluye lo que ya programaste; no considera gastos o ingresos que aún no registras como recurrentes.",
        "El saldo de una tarjeta es deuda: por eso resta en el patrimonio neto.",
        "Toca el ícono del ojo en la barra superior para ocultar todos los montos antes de tomar una captura. Vuelve a tocarlo para mostrarlos.",
      ],
    },
  ],
} satisfies Manual;
