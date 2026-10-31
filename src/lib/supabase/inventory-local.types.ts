import type { Database } from "./database.generated";
export type InventoryPackage = { id: string; household_id: string; item_id: string; label: string; group_name: string; group_id: string | null; capacity: number; remaining: number; is_open: boolean; created_at: string };
export type InventoryPackageEvent = { id: string; household_id: string; item_id: string; package_id: string; actor_id: string; kind: "added" | "open" | "consume" | "correct"; before_amount: number; after_amount: number; note: string; created_at: string };
type Table<R> = { Row: R; Insert: Partial<R>; Update: Partial<R>; Relationships: [] };
export type InventoryTables = {
  inventory_packages: Table<InventoryPackage>;
  inventory_package_events: Table<InventoryPackageEvent>;
};
export type InventoryFunctions = {
  inventory_create_with_packages: { Args: { p_item: import("./database.generated").Json; p_label: string; p_count: number; p_capacity: number; p_group: string }; Returns: string };
  inventory_set_threshold: { Args: { p_item: string; p_threshold: number | null }; Returns: undefined };
  inventory_add_packages: { Args: { p_item: string; p_label: string; p_count: number; p_capacity: number; p_group_name?: string }; Returns: undefined };
  inventory_package_change: { Args: { p_package: string; p_action: string; p_amount: number; p_note: string }; Returns: undefined };
};
export type InventoryItemWithThreshold = Database["public"]["Tables"]["inventory_items"]["Row"] & { low_stock_threshold: number | null };
