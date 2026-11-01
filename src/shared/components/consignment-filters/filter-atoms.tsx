"use client";

import * as React from "react";

import { Input } from "@/shared/components/ui/input";
import { NativeSelect } from "@/shared/components/ui/native-select";
import { cn } from "@/shared/lib/utils";

/** Shared building blocks for the consignment list filter bars (request + admin). */

export const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <div className={cn("min-w-0 space-y-1.5", className)}>
    <label className="block text-xs font-medium text-muted-foreground">
      {label}
    </label>
    {children}
  </div>
);

export const GroupTitle: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => (
  <p className="col-span-full text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
    {children}
  </p>
);

/** Keeps its own value and debounces up to the parent, so typing stays smooth. */
export const DebouncedInput: React.FC<{
  value: string;
  onCommit: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  icon?: React.ReactNode;
  transform?: (raw: string) => string;
}> = ({
  value,
  onCommit,
  placeholder,
  maxLength,
  className,
  icon,
  transform,
}) => {
  const [local, setLocal] = React.useState(value);
  React.useEffect(() => setLocal(value), [value]);
  React.useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onCommit(local), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);
  return (
    <div className="relative">
      {icon ? (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      ) : null}
      <Input
        value={local}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) =>
          setLocal(transform ? transform(e.target.value) : e.target.value)
        }
        className={cn(icon ? "pl-8" : "", className)}
      />
    </div>
  );
};

/** Any / Yes / No — `false` is a distinct, meaningful choice on these lists. */
export const TriState: React.FC<{
  value: string;
  onChange: (v: string) => void;
}> = ({ value, onChange }) => (
  <NativeSelect
    value={value}
    onChange={(e) => onChange(e.target.value)}
    options={[
      { value: "", label: "Any" },
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ]}
  />
);

/** A single-select over a static {key,label} list, with an Any option. */
export const MetaSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { key: string; label: string }[];
  anyLabel?: string;
}> = ({ value, onChange, options, anyLabel = "Any" }) => (
  <NativeSelect
    value={value}
    onChange={(e) => onChange(e.target.value)}
    options={[
      { value: "", label: anyLabel },
      ...options.map((o) => ({ value: o.key, label: o.label })),
    ]}
  />
);

/** Multi-select chips over a static {key,label} list (statuses, settlement…). */
export const ChipMultiSelect: React.FC<{
  value: string[];
  onToggle: (key: string) => void;
  options: { key: string; label: string }[];
}> = ({ value, onToggle, options }) =>
  options.length === 0 ? null : (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const selected = value.includes(o.key);
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onToggle(o.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
