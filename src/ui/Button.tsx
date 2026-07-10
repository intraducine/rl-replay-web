import type { ButtonHTMLAttributes, ReactNode } from "react";
import { TooltipBubble } from "./Tooltip";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  icon?: ReactNode;
  tooltip?: ReactNode;
};

export function Button({ className = "", variant = "secondary", icon, children, tooltip, type = "button", ...props }: ButtonProps) {
  return (
    <button type={type} className={`button button-${variant} ${tooltip ? "tooltip-target" : ""} ${className}`} {...props}>
      {icon}
      {children}
      {tooltip ? <TooltipBubble>{tooltip}</TooltipBubble> : null}
    </button>
  );
}
