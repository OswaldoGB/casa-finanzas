import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLockup } from "@/components/brand-mark";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <BrandLockup className="mb-8 justify-center [&>span]:text-xl [&>svg]:size-10" />
        <div className="bg-card rounded-2xl border p-6 shadow-xs">
          {children}
        </div>
      </div>
    </div>
  );
}
