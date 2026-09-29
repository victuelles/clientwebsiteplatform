"use client";

import type { ComponentProps } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type FormTextFieldProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
} & Omit<ComponentProps<typeof Input>, "name" | "defaultValue" | "value" | "onChange" | "onBlur">;

/** A labelled text input bound to react-hook-form, with inline validation errors. */
export function FormTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  id,
  className,
  ...inputProps
}: FormTextFieldProps<T>) {
  const inputId = id ?? name;
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={inputId}>{label}</FieldLabel>
          <Input
            {...inputProps}
            {...field}
            value={field.value ?? ""}
            id={inputId}
            aria-invalid={fieldState.invalid}
            className={className ?? "h-10"}
          />
          {description && !fieldState.invalid && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
}
