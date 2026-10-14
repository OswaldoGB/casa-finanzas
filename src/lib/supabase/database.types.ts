import type { Database as GeneratedDatabase } from "./database.generated";
export type {
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
  CompositeTypes,
} from "./database.generated";
export { Constants } from "./database.generated";

// PostgreSQL functions accept NULL for these optional business references;
// the generator does not infer argument nullability from function bodies.
type Functions = GeneratedDatabase["public"]["Functions"];
type NullableArgs<F extends { Args: object }, K extends keyof F["Args"]> = Omit<
  F,
  "Args"
> & {
  Args: Omit<F["Args"], K> & { [P in K]: F["Args"][P] | null };
};
type Overrides = {
  assign_shopping_list_project: NullableArgs<
    Functions["assign_shopping_list_project"],
    "p_project_id"
  >;
  create_trip_activity_item: NullableArgs<
    Functions["create_trip_activity_item"],
    "p_estimated_price"
  >;
  record_shopping_purchase: NullableArgs<
    Functions["record_shopping_purchase"],
    "p_group_id" | "p_payment_method_id"
  >;
  record_trip_expense: NullableArgs<
    Functions["record_trip_expense"],
    "p_method_id"
  >;
  save_trip: NullableArgs<Functions["save_trip"], "p_project_id">;
};
export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
    Functions: Omit<Functions, keyof Overrides> & Overrides;
  };
};
