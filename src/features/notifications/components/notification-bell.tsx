"use client";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshMyNotices } from "../actions";
export function NotificationBell({
  unread,
  userId,
}: {
  unread: number;
  userId: string;
}) {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    let mounted = true;
    refreshMyNotices()
      .then((r) => {
        if (mounted && r.error) setError(true);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    const supabase = createClient();
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [router, userId]);
  return (
    <Link
      href="/notifications"
      title={error ? "Avisos: entra para actualizar" : "Notificaciones"}
      aria-label={`Notificaciones${unread ? `, ${unread} sin leer` : ""}`}
      className="hover:bg-muted relative ml-auto grid size-10 shrink-0 place-items-center rounded-xl"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="bg-primary text-primary-foreground absolute top-0 right-0 min-w-4 rounded-full px-1 text-center text-[10px]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
