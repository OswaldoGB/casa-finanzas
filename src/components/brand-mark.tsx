import { cn } from "@/lib/utils";

type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("block", className)}
      fill="none"
      focusable="false"
      role={title ? "img" : undefined}
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      <rect width="48" height="48" rx="14" fill="currentColor" />
      <rect x="10" y="10" width="10" height="10" rx="3" fill="white" />
      <rect
        x="22"
        y="10"
        width="16"
        height="10"
        rx="3"
        fill="white"
        opacity="0.72"
      />
      <rect x="10" y="22" width="16" height="16" rx="3" fill="#76E4BE" />
      <rect
        x="28"
        y="22"
        width="10"
        height="16"
        rx="3"
        fill="white"
        opacity="0.9"
      />
      <path
        d="M14 30h8m-4-4v8"
        stroke="#14221D"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
  );
}

export function BrandLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <BrandMark className="text-primary size-9 shrink-0" />
      <span className="min-w-0 truncate text-[0.95rem] font-bold tracking-[-0.035em]">
        Casa <span className="text-primary">&amp;</span> Finanzas
      </span>
    </div>
  );
}
