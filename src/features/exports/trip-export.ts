import { tripTotals, tripCostBreakdown } from "../trips/totals";
import { shoppingItemStatus } from "../shopping-lists/purchase-totals";
import type { TripData } from "../trips/schemas";
import type { ExportRow } from "./format";
const labels: Record<string, string> = {
  pending: "Pendiente",
  cart: "En carrito",
  purchased: "Comprado",
  available: "Ya lo tenemos",
  discarded: "No comprar",
  legacy_unbought: "No comprado · histórico",
};
export function tripExportRows(data: TripData): ExportRow[] {
  const totals = tripTotals(data),
    groups = new Map(data.groups.map((g) => [g.id, g.name])),
    purchases = new Map(data.purchases.map((p) => [p.id, p]));
  return [
    {
      sección: "Resumen",
      viaje: data.project.name,
      destino: data.detail.destination,
      inicio: data.project.start_date,
      final: data.project.end_date,
      máximo: totals.maximum,
      estimado: totals.estimated,
      real: totals.real,
      pendiente: totals.pending,
      proyección: totals.projected,
      margen: totals.margin,
      precios_faltantes: totals.missingPrices,
    },
    ...data.costLines.map((line) => {
      const t = tripCostBreakdown(
        line,
        data.costTransactions,
        data.transactions,
      );
      return {
        sección: "Conceptos",
        concepto: line.name,
        cantidad: line.quantity,
        unidad: line.unit,
        estimado: t.estimated,
        real: t.real,
        pendiente: t.pending,
        diferencia: t.difference,
        estado: line.is_settled
          ? "Completado"
          : t.real != null
            ? "Pago parcial"
            : "Planeado",
      };
    }),
    ...data.items.map((item) => ({
      sección: "Productos",
      concepto: item.name,
      lugar: item.purchase_id
        ? (purchases.get(item.purchase_id)?.store_name ?? "Por decidir")
        : (groups.get(item.group_id ?? "") ?? "Por decidir"),
      cantidad: item.quantity,
      unidad: item.unit,
      estimado:
        item.estimated_price == null
          ? null
          : Math.round(item.estimated_price * item.quantity * 100) / 100,
      real_desglose:
        item.real_price == null
          ? null
          : Math.round(item.real_price * item.quantity * 100) / 100,
      estado: labels[shoppingItemStatus(item)],
      movimiento_id: item.purchase_id
        ? (purchases.get(item.purchase_id)?.transaction_id ?? "")
        : "",
    })),
    ...data.purchases.map((p) => ({
      sección: "Compras",
      lugar: p.store_name,
      movimiento_id: p.transaction_id,
      real:
        data.transactions.find((t) => t.id === p.transaction_id)?.amount ??
        null,
    })),
    ...data.activities.map((a) => ({
      sección: "Agenda",
      concepto: a.title,
      fecha: a.date,
      hora: a.time ?? "",
      lugar: a.location,
      tipo: a.kind,
      notas: a.notes,
    })),
  ];
}
