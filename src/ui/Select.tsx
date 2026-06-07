import type { ReactNode, SelectHTMLAttributes } from "react";
import { TooltipBubble } from "./Tooltip";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ value: string | number; label: string }>;
  tooltip?: ReactNode;
};

export function Select({ label, options, tooltip, className = "", ...props }: SelectProps) {
  return (
    <label className={`select ${tooltip ? "tooltip-target" : ""} ${className}`}>
      <span>{label}</span>
      <select {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {tooltip ? <TooltipBubble>{tooltip}</TooltipBubble> : null}
    </label>
  );
}
