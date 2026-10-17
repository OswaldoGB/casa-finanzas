// Temporary contracts until the reviewed migrations are applied and types regenerated.
import type { Json } from "./database.generated";
import type {
  UserNotification,
  NotificationPreference,
  PushSubscriptionRecord,
  NotificationDelivery,
} from "@/features/notifications/types";
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
  user_notifications: Table<UserNotification>;
  reminder_preferences: Table<NotificationPreference>;
  push_subscriptions: Table<PushSubscriptionRecord>;
  notification_deliveries: Table<NotificationDelivery>;
  reminders: Table<ReminderRecord>;
  reminder_categories: Table<ReminderCategory>;
  reminder_events: Table<ReminderEvent>;
};
export type ReminderFunctions = {
  refresh_my_reminder_notifications: {
    Args: Record<string, never>;
    Returns: Json;
  };
  prepare_reminder_notifications: { Args: { p_now?: string }; Returns: Json };
  claim_notification_deliveries: {
    Args: { p_limit: number; p_now?: string };
    Returns: Json;
  };
  validate_notification_delivery: {
    Args: { p_id: string; p_lease_token: string };
    Returns: boolean;
  };
  mark_notifications_read: {
    Args: { p_id: string | null };
    Returns: undefined;
  };
  set_reminder_preferences: {
    Args: { p_shared: boolean; p_push: boolean };
    Returns: undefined;
  };
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
