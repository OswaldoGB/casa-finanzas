import { redirect } from "next/navigation";

export const metadata = { title: "Nuevo movimiento" };
export default function NewTransactionPage() {
  redirect("/transactions?new=1");
}
