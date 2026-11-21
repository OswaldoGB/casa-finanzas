import { Suspense } from "react";
import { LoansView } from "@/features/loans/components/loans-view";
import { getLoans } from "@/features/loans/queries";

export const metadata = { title: "Préstamos y deudas" };

export default async function LoansPage() {
  const data = await getLoans();
  return (
    <Suspense fallback={<p role="status">Cargando préstamos…</p>}>
      <LoansView data={data} />
    </Suspense>
  );
}
