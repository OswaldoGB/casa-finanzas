"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
export function ReminderSync() {
  const router = useRouter();
  useEffect(() => {
    const client = createClient();
    const channel = client
      .channel("reminders-visible")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminders" },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reminder_categories" },
        () => router.refresh(),
      )
      .subscribe();
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
      void client.removeChannel(channel);
    };
  }, [router]);
  return null;
}
