// Temporary contracts until the reviewed migrations are applied and types regenerated.
import type { Json } from "./database.generated";
import type {
  ReminderRecord,
  ReminderCategory,
  ReminderEvent,
} from "@/features/reminders/types";
type Table<R> = {
  Row: R;
  Insert: Partial<R>;
  Update: Partial<R>;
  Relationships: [];
};
export type ReminderTables = {
  reminders: Table<ReminderRecord>;
  reminder_categories: Table<ReminderCategory>;
  reminder_events: Table<ReminderEvent>;
};
export type ReminderFunctions = {
  save_reminder: {
    Args: { p_input: Json; p_request_key: string };
    Returns: Json;
  };
  complete_reminder: {
    Args: {
      p_id: string;
      p_occurrence_id: string;
      p_input: Json;
      p_request_key: string;
    };
    Returns: Json;
  };
  reminder_operation: {
    Args: { p_id: string; p_operation: string; p_input: Json };
    Returns: Json;
  };
  reminder_snapshot: { Args: { p_id: string }; Returns: Json };
};
