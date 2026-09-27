import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-xl">
            <Wallet className="size-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight">Casa &amp; Finanzas</span>
        </div>
        <div className="bg-card rounded-2xl border p-6 shadow-xs">{children}</div>
      </div>
    </div>
  );
}
