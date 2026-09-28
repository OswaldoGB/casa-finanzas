import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { loanSnapshotSchema } from "@/features/loans/schemas";
import { savingsSnapshotSchema } from "@/features/savings/schemas";
export async function getDashboardSavings() {
  const { supabase } = await requireModule("dashboard");
  const [loans, goals] = await Promise.all([
    supabase.rpc("loan_snapshot", { p_module: "dashboard" }),
    supabase.rpc("savings_snapshot", { p_module: "dashboard" }),
  ]);
  if (loans.error || goals.error)
    throw new Error("No se pudo cargar el resumen de préstamos y ahorro.");
  return {
    loans: loanSnapshotSchema.parse(loans.data),
    goals: savingsSnapshotSchema.parse(goals.data),
  };
}
