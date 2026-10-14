import type { TotalsItem } from "./schemas";

type Item = TotalsItem & { purchase_id?: string | null; resolution?: string };
type Purchase = { id?: string; transaction_id: string };
type Transaction = { id: string; amount: number; status?: string };

export function shoppingItemStatus(item: Item) {
  if (item.purchase_id) return "purchased";
  if (item.resolution && item.resolution !== "pending") return item.resolution;
  return item.checked ? "cart" : "pending";
}
function scaledTotal(items: Item[], price: (item: Item) => number | null) {
  const sum = items.reduce((total,item) => {
    const amount = price(item);
    return total + (amount == null ? 0n : BigInt(Math.round(amount * 100)) * BigInt(Math.round(item.quantity * 1000)));
  },0n);
  return Number((sum + 500n) / 1000n) / 100;
}
export function shoppingPurchaseTotals(items: Item[], purchases: Purchase[], transactions: Transaction[]) {
  const byId = new Map(transactions.filter(t=>!t.status || t.status==="posted").map(t=>[t.id,t.amount]));
  const paid = [...new Set(purchases.map(p=>p.transaction_id))].reduce((cents,id)=>cents+Math.round((byId.get(id)??0)*100),0)/100;
  const cartItems = items.filter(i=>shoppingItemStatus(i)==="cart");
  const pendingItems = items.filter(i=>shoppingItemStatus(i)==="pending");
  const cart=scaledTotal(cartItems,i=>i.real_price);
  const pending=scaledTotal(pendingItems,i=>i.estimated_price);
  const discrepancies=purchases.flatMap(p=>{
    const linked=items.filter(i=>i.purchase_id===p.id);
    if (!p.id || !linked.length || !byId.has(p.transaction_id)) return [];
    const difference=Math.round(((byId.get(p.transaction_id)??0)-scaledTotal(linked,i=>i.real_price))*100)/100;
    return difference ? [{purchase_id:p.id,difference}] : [];
  });
  return {paid,cart,pending,projected:Math.round((paid+cart+pending)*100)/100,
    missingCart:cartItems.filter(i=>i.real_price==null).length,
    missingPending:pendingItems.filter(i=>i.estimated_price==null).length,discrepancies};
}
