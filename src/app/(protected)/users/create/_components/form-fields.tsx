"use client";

import * as React from "react";
import { ChevronDown, Eye, EyeOff } from "lucide-react";

import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/lib/utils";

/**
 * Layout and field primitives for the user form.
 *
 * Every control here is uncontrolled — it carries a `name` and the parent
 * reads it back with `FormData` on submit. The only prop that changes how a
 * field renders is `error`, which comes from the server's 422.
 *
 * Kept in this folder rather than `shared/`: the user form is the only caller.
 * They move up the moment a second form needs them.
 */

export function FormSection({
  title,
  description,
  single,
  children,
}: {
  title: string;
  description: string;
  /** Full width instead of the two-column grid — for wide controls. */
  single?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <div className="space-y-1 border-b border-border/70 pb-3">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className={cn("grid gap-5", !single && "sm:grid-cols-2")}>
        {children}
      </div>
    </section>
  );
}

/**
 * Label on the left, required marker on the right.
 *
 * The asterisk is `aria-hidden`: the input's own `required` attribute is what
 * assistive tech announces, and a stray "star" read before every mandatory
 * field is noise. It is also never the only signal — `required` still blocks
 * submission if someone cannot see it.
 */
function FieldLabel({
  htmlFor,
  label,
  required,
}: {
  htmlFor: string;
  label: string;
  required?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {required ? (
        <span aria-hidden className="text-sm font-semibold leading-none text-destructive">
          *
        </span>
      ) : null}
    </div>
  );
}

interface FormFieldProps extends React.ComponentProps<"input"> {
  name: string;
  label: string;
  hint?: string;
  error?: string;
}

export function FormField({
  name,
  label,
  hint,
  error,
  ...props
}: FormFieldProps) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={name} label={label} required={props.required} />
      <Input
        id={name}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      <FieldMessage id={name} error={error} hint={hint} />
    </div>
  );
}

/**
 * A password field with its own show/hide toggle.
 *
 * State is per field, not shared: revealing the password and revealing the
 * confirmation are separate decisions, and tying them together would defeat
 * the point of asking twice.
 */
export function PasswordField({
  name,
  label,
  hint,
  error,
  ...props
}: FormFieldProps) {
  const [visible, setVisible] = React.useState(false);
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={name} label={label} required={props.required} />
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="pr-11"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {visible ? (
            <EyeOff className="size-[18px]" />
          ) : (
            <Eye className="size-[18px]" />
          )}
        </button>
      </div>
      <FieldMessage id={name} error={error} hint={hint} />
    </div>
  );
}

export function FormSelect({
  name,
  label,
  options,
  error,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  error?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={name} label={label} required={required} />
      {/* A native select rather than a custom listbox: it is keyboard- and
          screen-reader-correct for free, and opens as a native picker on
          mobile. Styled to match `Input`. */}
      <div className="relative">
        <select
          id={name}
          name={name}
          defaultValue={defaultValue}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
          className={cn(
            "flex h-11 w-full appearance-none rounded-lg border border-transparent bg-secondary px-3.5 py-2 pr-10 text-sm text-foreground transition-colors",
            "focus-visible:border-ring/40 focus-visible:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20",
          )}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {/* `appearance-none` removes the platform arrow, so the affordance has
            to be drawn back. `pointer-events-none` keeps the click falling
            through to the select — an icon that swallowed it would make the
            right edge of the field dead. Decorative, hence `aria-hidden`. */}
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
      </div>
      <FieldMessage id={name} error={error} />
    </div>
  );
}

/**
 * The error wins over the hint — they occupy the same line, and once a field
 * is wrong the hint is no longer the thing the user needs to read.
 */
export function FieldMessage({
  id,
  error,
  hint,
}: {
  id: string;
  error?: string;
  hint?: string;
}) {
  if (error) {
    return (
      <p id={`${id}-error`} role="alert" className="text-xs text-destructive">
        {error}
      </p>
    );
  }

  if (hint) {
    return (
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {hint}
      </p>
    );
  }

  return null;
}
