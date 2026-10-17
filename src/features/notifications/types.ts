import type { Json } from "@/lib/supabase/database.generated";
export type UserNotification = {
  id: string;
  household_id: string;
  user_id: string;
  reminder_id: string;
  schedule_revision: number;
  condition_key: string;
  message: string;
  is_active: boolean;
  read_at: string | null;
  created_at: string;
};
export type NotificationPreference = {
  user_id: string;
  household_id: string;
  shared_enabled: boolean;
  push_enabled: boolean;
  last_test_at: string | null;
};
export type PushSubscriptionRecord = {
  id: string;
  household_id: string;
  user_id: string;
  endpoint: string;
  keys: Json;
  device_token_hash: string;
  device_name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};
export type NotificationDelivery = {
  id: string;
  notification_id: string;
  subscription_id: string;
  status: string;
  attempts: number;
  lease_until: string | null;
  lease_token: string | null;
  next_attempt_at: string;
  sent_at: string | null;
  last_error: string | null;
};
export type DeliveryClaim = {
  id: string;
  lease_token: string;
  notification_id: string;
  reminder_id: string;
  message: string;
  subscription_id: string;
  endpoint: string;
  keys: { auth: string; p256dh: string };
  attempts: number;
};
