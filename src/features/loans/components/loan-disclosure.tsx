"use client";

import { useState, type ReactNode } from "react";

export function LoanDisclosure({
  className,
  summary,
  children,
}: {
  className?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const [hasOpened, setHasOpened] = useState(false);

  return (
    <details
      className={className}
      onToggle={(event) => {
        if (event.target === event.currentTarget && event.currentTarget.open) {
          setHasOpened(true);
        }
      }}
    >
      {summary}
      {hasOpened && children}
    </details>
  );
}
