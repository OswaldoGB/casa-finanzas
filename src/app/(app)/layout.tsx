import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { BottomNav } from "@/components/app-shell/bottom-nav";
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
      <AppSidebar
        user={{ fullName: profile.full_name, role: profile.role, permissions }}
      />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 px-4 max-md:hidden">
          <SidebarTrigger aria-label="Mostrar u ocultar menú" />
        </header>
        <main className="flex-1 px-4 pt-4 pb-28 md:px-8 md:pb-10">
          {children}
        </main>
      </SidebarInset>
      <BottomNav role={profile.role} permissions={permissions} />
    </SidebarProvider>
  );
}
