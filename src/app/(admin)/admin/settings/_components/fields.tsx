"use client";

import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function TextareaField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rows = 3,
  maxLength,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  rows?: number;
  maxLength?: number;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          <Textarea
            {...field}
            value={field.value ?? ""}
            id={name}
            rows={rows}
            maxLength={maxLength}
            aria-invalid={fieldState.invalid}
          />
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}

export function SwitchField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  onBeforeChange,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  /** Return false to cancel (e.g. to show a confirmation first). */
  onBeforeChange?: (next: boolean, apply: () => void) => boolean;
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
          <div className="space-y-1">
            <label htmlFor={name} className="text-sm font-medium">
              {label}
            </label>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <Switch
            id={name}
            checked={Boolean(field.value)}
            onCheckedChange={(next) => {
              const apply = () => field.onChange(next);
              if (onBeforeChange && !onBeforeChange(next, apply)) return;
              apply();
            }}
          />
        </div>
      )}
    />
  );
}

export function FieldSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
