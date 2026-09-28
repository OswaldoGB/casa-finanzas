import { getAccess } from "@/features/permissions/queries";
import {
  allowedSearchTargets,
  normalizeSearch,
  type SearchResult,
} from "@/features/search/search";

export async function GET(request: Request) {
  const { supabase, profile, permissions } = await getAccess();
  const query = normalizeSearch(
    new URL(request.url).searchParams.get("q") ?? "",
  );
  const headers = { "Cache-Control": "private, no-store" };
  if (query.length < 2) return Response.json({ results: [] }, { headers });

  try {
    const groups = await Promise.all(
      allowedSearchTargets(profile.role, permissions).map(async (target) => {
        const { data, error } = await supabase
          .from(target.table)
          .select("*")
          .eq("household_id", profile.household_id)
          .ilike(target.column, `%${query}%`)
          .order("created_at", { ascending: false })
          .limit(6);
        if (error) throw error;
        return (data ?? []).map((row): SearchResult => {
          const title =
            "name" in row
              ? row.name
              : "debtor" in row
                ? row.debtor
                : row.description;
          let href = `${target.path}/${row.id}`;
          if (target.module === "loans" || target.module === "savings")
            href = `${target.path}#${row.id}`;
          if (target.module === "shopping")
            href = `${target.path}?status=${"status" in row ? row.status : "pending"}#${row.id}`;
          return {
            id: `${target.table}:${row.id}`,
            title,
            label: target.label,
            href,
          };
        });
      }),
    );
    return Response.json({ results: groups.flat() }, { headers });
  } catch {
    return Response.json(
      { error: "No se pudo realizar la búsqueda. Intenta de nuevo." },
      { status: 500, headers },
    );
  }
}
