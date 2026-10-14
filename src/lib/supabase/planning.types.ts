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
export type TripDetail = Audit & {
  project_id: string;
  destination: string;
  participants: string;
};
export type TripActivity = Audit & {
  project_id: string;
  date: string;
  kind: string;
  time: string | null;
  title: string;
  location: string;
  notes: string;
  sort_order: number;
};
export type TripCostLine = Audit & {
  is_settled: boolean;
  project_id: string;
  activity_id: string | null;
  name: string;
  quantity: number;
  unit: string;
  estimated_price: number | null;
  category_id: string | null;
};
export type TripCostTransaction = Audit & {
  project_id: string;
  cost_line_id: string;
  transaction_id: string;
  request_key: string | null;
  request_payload: Json | null;
};
export type TripActivityItem = Audit & {
  project_id: string;
  activity_id: string;
  item_id: string;
  required_quantity: number;
  unit: string;
};

// Local migration contracts; regenerate database.types.ts after applying migrations.
export type PlanningTables = {
  trip_details: Table<TripDetail, "household_id" | "created_by" | "project_id">;
  trip_activities: Table<
    TripActivity,
    "household_id" | "created_by" | "project_id" | "date" | "kind" | "title"
  >;
  trip_cost_lines: Table<
    TripCostLine,
    "household_id" | "created_by" | "project_id" | "name"
  >;
  trip_cost_transactions: Table<
    TripCostTransaction,
    | "household_id"
    | "created_by"
    | "project_id"
    | "cost_line_id"
    | "transaction_id"
  >;
  trip_activity_items: Table<
    TripActivityItem,
    | "household_id"
    | "created_by"
    | "project_id"
    | "activity_id"
    | "item_id"
    | "required_quantity"
  >;
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
  travel_transaction_source: {
    Args: { p_transaction_id: string };
    Returns: Json;
  };
  save_trip: {
    Args: {
      p_project_id: string | null;
      p_name: string;
      p_budget: number;
      p_start_date: string;
      p_end_date: string;
      p_status: string;
      p_destination: string;
      p_participants: string;
      p_description: string;
    };
    Returns: string;
  };
  trip_snapshot: { Args: { p_project_id: string }; Returns: Json };
  ensure_trip_shopping_list: {
    Args: { p_project_id: string };
    Returns: string;
  };
  link_trip_item: {
    Args: {
      p_activity_id: string;
      p_item_id: string;
      p_quantity: number;
      p_unit: string;
      p_adjust_purchase?: boolean;
    };
    Returns: undefined;
  };
  create_trip_activity_item: {
    Args: {
      p_activity_id: string;
      p_name: string;
      p_quantity: number;
      p_unit: string;
      p_estimated_price: number | null;
    };
    Returns: string;
  };
  link_trip_cost_transaction: {
    Args: { p_line_id: string; p_transaction_id: string; p_settle?: boolean };
    Returns: undefined;
  };
  assign_shopping_list_project: {
    Args: {
      p_list_id: string;
      p_project_id: string | null;
      p_confirm_financial_change?: boolean;
    };
    Returns: undefined;
  };
  record_trip_expense: {
    Args: {
      p_settle?: boolean;
      p_line_id: string;
      p_amount: number;
      p_date: string;
      p_account_id: string;
      p_category_id: string;
      p_method_id: string | null;
      p_request_key: string;
    };
    Returns: string;
  };
  remove_trip_activity: { Args: { p_activity_id: string }; Returns: undefined };
  record_shopping_purchase: {
    Args: {
      p_expected_total?: number;
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
