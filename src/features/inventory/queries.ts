import "server-only";
import { requireModule } from "@/features/permissions/queries";
import { canAccess } from "@/features/permissions/modules";
import { todayInTimeZone } from "@/features/recurring/processing";

export async function getInventory() {
  const { supabase, profile, permissions } = await requireModule("inventory");
  const [result, household] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("*")
      .eq("household_id", profile.household_id)
      .order("name"),
    supabase
      .from("households")
      .select("timezone")
      .eq("id", profile.household_id)
      .single(),
  ]);
  if (result.error || household.error)
    throw new Error("No se pudo cargar el inventario.");
  const paths = result.data.flatMap((item) =>
    item.photo_path ? [item.photo_path] : [],
  );
  const photos = paths.length
    ? await supabase.storage.from("inventory").createSignedUrls(paths, 60)
    : null;
  const urls = new Map(
    photos?.data?.map((photo) => [photo.path, photo.signedUrl]) ?? [],
  );
  const transactionResult = canAccess(
    profile.role,
    permissions,
    "transactions",
    "view",
  )
    ? await supabase
        .from("transactions")
        .select("id,date,description,amount")
        .eq("household_id", profile.household_id)
        .eq("type", "expense")
        .eq("status", "posted")
        .order("date", { ascending: false })
        .limit(200)
    : null;
  if (transactionResult?.error)
    throw new Error("No se pudieron cargar los gastos para vincular.");
  return {
    transactions: transactionResult?.data ?? [],
    items: result.data.map((item) => ({
      ...item,
      photoUrl: item.photo_path ? urls.get(item.photo_path) : undefined,
    })),
    today: todayInTimeZone(new Date(), household.data.timezone),
    canEdit: canAccess(profile.role, permissions, "inventory", "edit"),
  };
}
export type InventoryItem = Awaited<
  ReturnType<typeof getInventory>
>["items"][number];
