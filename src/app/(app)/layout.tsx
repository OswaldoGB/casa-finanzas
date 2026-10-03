import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { GlobalSearch } from "@/components/app-shell/global-search";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getAccess } from "@/features/permissions/queries";
import { processRecurringForHousehold } from "@/features/recurring/process-due";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, permissions } = await getAccess();
  try {
    await processRecurringForHousehold(profile.household_id);
  } catch (error) {
    console.error(
      "No se pudieron procesar los movimientos recurrentes.",
      error,
    );
  }

  return (
    <SidebarProvider>
      <a
        href="#main-content"
        className="bg-background text-foreground fixed top-2 left-2 z-50 -translate-y-24 rounded-lg border px-4 py-2 focus:translate-y-0"
      >
        Saltar al contenido
      </a>
      <AppSidebar
        user={{ fullName: profile.full_name, role: profile.role, permissions }}
      />
      <SidebarInset className="min-w-0 overflow-x-clip">
        <header className="flex h-14 items-center gap-2 px-4">
          <SidebarTrigger
            className="max-md:hidden"
            aria-label="Mostrar u ocultar menú"
          />
          <GlobalSearch role={profile.role} permissions={permissions} />
        </header>
        <div
          id="main-content"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-x-clip px-4 pt-4 pb-28 md:px-8 md:pb-10"
        >
          {children}
        </div>
      </SidebarInset>
      <BottomNav role={profile.role} permissions={permissions} />
    </SidebarProvider>
  );
}
