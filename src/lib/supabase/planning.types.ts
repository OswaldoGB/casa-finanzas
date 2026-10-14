import type { Json } from "./database.types";

type Audit = {
  id: string;
  household_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};
type Table<Row, Required extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};
export type ShoppingGroup = Audit & {
  list_id: string;
  name: string;
  sort_order: number;
  is_archived: boolean;
};
export type ShoppingPurchase = Audit & {
  list_id: string;
  group_id: string | null;
  store_name: string;
  transaction_id: string;
  request_key: string;
  request_payload: Json;
};

// Local migration contracts; regenerate database.types.ts after applying migrations.
export type PlanningTables = {
  shopping_list_groups: Table<
    ShoppingGroup,
    "household_id" | "created_by" | "list_id" | "name"
  >;
  shopping_list_purchases: Table<
    ShoppingPurchase,
    "household_id" | "created_by" | "list_id" | "transaction_id" | "request_key"
  >;
};
export type PlanningColumns = {
  shopping_lists: {
    Row: { project_id: string | null };
    Insert: { project_id?: string | null };
    Update: { project_id?: string | null };
  };
  shopping_list_items: {
    Row: {
      group_id: string | null;
      purchase_id: string | null;
      resolution: string;
    };
    Insert: {
      group_id?: string | null;
      purchase_id?: string | null;
      resolution?: string;
    };
    Update: {
      group_id?: string | null;
      purchase_id?: string | null;
      resolution?: string;
    };
  };
};
export type PlanningFunctions = {
  record_shopping_purchase: {
    Args: {
      p_list_id: string;
      p_group_id: string | null;
      p_item_ids: string[];
      p_account_id: string;
      p_category_id: string;
      p_date: string;
      p_payment_method_id: string | null;
      p_request_key: string;
    };
    Returns: Json;
  };
  set_shopping_item_resolution: {
    Args: { p_item_id: string; p_resolution: string };
    Returns: undefined;
  };
  reopen_shopping_list: { Args: { p_list_id: string }; Returns: undefined };
  archive_shopping_group: { Args: { p_group_id: string }; Returns: undefined };
  shopping_purchase_snapshot: { Args: { p_list_id: string }; Returns: Json };
};
