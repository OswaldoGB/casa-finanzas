import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", userId).single();
  if (!profile) redirect("/login?error=profile");

  return (
    <SidebarProvider>
      <AppSidebar user={{ fullName: profile.full_name, role: profile.role }} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 px-4 max-md:hidden">
          <SidebarTrigger aria-label="Mostrar u ocultar menú" />
        </header>
        <main className="flex-1 px-4 pt-4 pb-28 md:px-8 md:pb-10">{children}</main>
      </SidebarInset>
      <BottomNav />
    </SidebarProvider>
  );
}
