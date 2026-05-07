import type { InputHTMLAttributes } from "react";

type SliderProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  valueLabel?: string;
};

export function Slider({ label, valueLabel, className = "", ...props }: SliderProps) {
  return (
    <label className={`slider ${className}`}>
      <span>
        {label}
        {valueLabel ? <strong>{valueLabel}</strong> : null}
      </span>
      <input type="range" {...props} />
    </label>
  );
}
