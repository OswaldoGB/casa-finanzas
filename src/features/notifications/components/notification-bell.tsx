"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { refreshMyNotices } from "../actions";

/**
 * Mantiene la bandeja al día: genera los avisos pendientes al entrar y refresca
 * la pantalla cuando llega uno nuevo (Realtime). Devuelve true si falló.
 */
export function useInboxSync(userId: string, enabled: boolean) {
  const router = useRouter();
  const [error, setError] = useState(false);
  useEffect(() => {
    if (!enabled) return;
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
        { event: "*", schema: "public", table: "user_notifications", filter: `user_id=eq.${userId}` },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      mounted = false;
      void supabase.removeChannel(channel);
    };
  }, [router, userId, enabled]);
  return error;
}
