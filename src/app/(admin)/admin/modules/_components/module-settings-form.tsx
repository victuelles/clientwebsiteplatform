"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  SectionEditorProvider,
  type FieldErrors,
} from "@/components/section-editor/editor-context";
import { FieldGroupInputs } from "@/components/section-editor/field-input";
import { zodFieldErrors } from "@/components/section-editor/zod-errors";
import { useUnsavedChangesWarning } from "@/components/shared/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { getModule } from "@/core/modules/registry";
import type { FieldDef } from "@/core/sections/fields";

import { saveModuleSettings } from "../actions";

/** A module's settings, generated from its manifest with the Phase 4 form generator. */
export function ModuleSettingsForm({
  moduleKey,
  fields,
  initial,
}: {
  moduleKey: string;
  fields: FieldDef[];
  initial: Record<string, unknown>;
}) {
  const [saved, setSaved] = useState(initial);
  const [value, setValue] = useState(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(saved) !== JSON.stringify(value);
  useUnsavedChangesWarning(dirty);

  function save() {
    const schema = getModule(moduleKey)?.settings?.schema;
    const parsed = schema?.safeParse(value);
    if (parsed && !parsed.success) {
      setErrors(zodFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    startTransition(async () => {
      const result = await saveModuleSettings({ key: moduleKey, settings: value });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(result.data.settings as Record<string, unknown>);
      setValue(result.data.settings as Record<string, unknown>);
      toast.success("Settings saved.");
    });
  }

  return (
    <SectionEditorProvider
      value={{
        readOnly: pending,
        pages: [],
        media: {},
        registerMedia: () => {},
        modules: {},
        feedSources: [],
      }}
    >
      <div className="max-w-xl space-y-6">
        <FieldGroupInputs
          fields={fields}
          value={value}
          onChange={setValue}
          errors={errors}
          idPrefix={`module-${moduleKey}`}
        />
        <div className="flex gap-3">
          <Button onClick={save} disabled={!dirty || pending}>
            Save settings
          </Button>
          <Button variant="outline" onClick={() => setValue(saved)} disabled={!dirty || pending}>
            Discard
          </Button>
        </div>
      </div>
    </SectionEditorProvider>
  );
}
