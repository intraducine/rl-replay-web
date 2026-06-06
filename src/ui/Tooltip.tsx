import type { ReactNode } from "react";

export function TooltipBubble({ children }: { children: ReactNode }) {
  return (
    <span className="tooltip-bubble" aria-hidden="true">
      {children}
    </span>
  );
}
