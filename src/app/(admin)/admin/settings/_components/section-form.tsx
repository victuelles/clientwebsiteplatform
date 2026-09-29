"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";

import { FormMessage } from "@/components/shared/form-message";
import { Button } from "@/components/ui/button";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/core/settings/schemas";

import { saveSettings } from "../actions";

/** One settings tab: validates with the section schema, saves through saveSettings. */
export function SectionForm<S extends SettingsSection>({
  section,
  defaultValues,
  onDirtyChange,
  children,
  aside,
}: {
  section: S;
  defaultValues: z.input<(typeof SETTINGS_SECTIONS)[S]>;
  onDirtyChange: (section: S, dirty: boolean) => void;
  children: (
    form: UseFormReturn<z.input<(typeof SETTINGS_SECTIONS)[S]> & FieldValues>,
  ) => React.ReactNode;
  aside?: (
    form: UseFormReturn<z.input<(typeof SETTINGS_SECTIONS)[S]> & FieldValues>,
  ) => React.ReactNode;
}) {
  type Input = z.input<(typeof SETTINGS_SECTIONS)[S]> & FieldValues;
  const form = useForm<Input>({
    resolver: zodResolver(SETTINGS_SECTIONS[section] as never),
    defaultValues: defaultValues as DefaultValues<Input>,
  });
  const dirty = form.formState.isDirty;

  useEffect(() => onDirtyChange(section, dirty), [dirty, onDirtyChange, section]);

  async function onSubmit() {
    // Send the raw form values: the server runs the same schema (including its transforms).
    const result = await saveSettings({ section, values: form.getValues() });
    if (!result.ok) {
      form.setError("root", { message: result.error });
      return;
    }
    form.reset(form.getValues());
    toast.success(
      result.data.changed.length
        ? "Settings saved. The live site is updated."
        : "No changes to save.",
    );
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      noValidate
      className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]"
    >
      <div className="space-y-6">
        {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
        {children(form)}
        <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t bg-background px-1 py-4">
          {dirty && (
            <span className="mr-auto text-sm text-accent" role="status">
              Unsaved changes
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={!dirty || form.formState.isSubmitting}
            onClick={() => form.reset()}
          >
            Discard
          </Button>
          <Button type="submit" disabled={!dirty || form.formState.isSubmitting}>
            Save changes
          </Button>
        </div>
      </div>
      {aside && <div className="lg:sticky lg:top-20 lg:self-start">{aside(form)}</div>}
    </form>
  );
}
