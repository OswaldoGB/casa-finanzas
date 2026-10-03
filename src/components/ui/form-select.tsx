"use client";

import { useState, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FormSelectOption = {
  value: string;
  label: string;
  leading?: ReactNode;
  disabled?: boolean;
};

export function FormSelect({
  name,
  id,
  options,
  placeholder,
  defaultValue = "",
  value,
  onValueChange,
  disabled = false,
  className,
}: {
  name: string;
  id?: string;
  options: FormSelectOption[];
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const selectedValue = value ?? uncontrolledValue;
  const selected = options.find((option) => option.value === selectedValue);

  function update(nextValue: string) {
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <Select
      value={selectedValue || undefined}
      onValueChange={update}
      disabled={disabled}
    >
      <input type="hidden" name={name} value={selectedValue} />
      <SelectTrigger id={id} className={cn("h-11 w-full", className)}>
        {selected ? (
          <span className="flex min-w-0 items-center gap-2">
            {selected.leading}
            <span className="truncate">{selected.label}</span>
          </span>
        ) : (
          <SelectValue placeholder={placeholder} />
        )}
      </SelectTrigger>
      <SelectContent position="popper" className="max-h-72">
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            <span className="flex min-w-0 items-center gap-2">
              {option.leading}
              <span className="truncate">{option.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
