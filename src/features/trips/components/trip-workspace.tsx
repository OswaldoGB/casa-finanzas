"use client";
import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import type { TripSnapshot } from "../schemas";
import { TripOverview } from "./trip-overview";
import { TripDays } from "./trip-days";
import { TripBudget } from "./trip-budget";
import { TripShopping } from "./trip-shopping";
export function TripWorkspace({
  snapshot,
  availableLists,
}: {
  snapshot: TripSnapshot;
  availableLists: { id: string; name: string }[];
}) {
  const router = useRouter();
  const tab = useSearchParams().get("tab");
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`trip-${snapshot.project.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "trip_details",
          filter: `project_id=eq.${snapshot.project.id}`,
        },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [snapshot.project.id, router]);
  return (
    <Tabs
      defaultValue={
        tab && ["overview", "days", "budget", "shopping"].includes(tab)
          ? tab
          : "overview"
      }
      className="min-w-0"
    >
      <TabsList className="grid w-full grid-cols-2 gap-1 group-data-horizontal/tabs:h-auto sm:grid-cols-4">
        {[
          ["overview", "Resumen"],
          ["days", "Por día"],
          ["budget", "Presupuesto"],
          ["shopping", "Compras"],
        ].map(([value, label]) => (
          <TabsTrigger
            key={value}
            value={value}
            className="h-auto min-w-0 py-2.5 text-sm"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value="overview" className="mt-5">
        <TripOverview snapshot={snapshot} />
      </TabsContent>
      <TabsContent value="days" className="mt-5">
        <TripDays snapshot={snapshot} />
      </TabsContent>
      <TabsContent value="budget" className="mt-5">
        <TripBudget snapshot={snapshot} />
      </TabsContent>
      <TabsContent value="shopping" className="mt-5">
        <TripShopping snapshot={snapshot} availableLists={availableLists} />
      </TabsContent>
    </Tabs>
  );
}
