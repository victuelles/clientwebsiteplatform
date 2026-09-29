"use client";

import { FieldGroupInputs } from "@/components/section-editor/field-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  BACKGROUND_LABELS,
  PADDING_LABELS,
  SECTION_PADDINGS,
  type SectionBackground,
} from "@/core/sections/common";
import { getSectionDefinition } from "@/core/sections/registry";

import type { SectionState } from "./types";

export type SettingsPatch = Partial<
  Pick<SectionState, "background" | "padding" | "anchorId" | "isHidden">
>;

export function SectionPanel({
  section,
  readOnly,
  onPropsChange,
  onSettingsChange,
}: {
  section: SectionState;
  readOnly: boolean;
  onPropsChange: (props: Record<string, unknown>) => void;
  onSettingsChange: (patch: SettingsPatch) => void;
}) {
  const definition = getSectionDefinition(section.type);
  if (!definition)
    return (
      <p className="text-sm text-destructive">
        Unknown section type “{section.type}”. Delete this section.
      </p>
    );

  const backgrounds = definition.backgrounds.map((value) => ({
    value,
    label: BACKGROUND_LABELS[value],
  }));
  const paddings = SECTION_PADDINGS.map((value) => ({ value, label: PADDING_LABELS[value] }));
  const errorCount = Object.keys(section.errors).length;

  return (
    <div className="space-y-6" data-testid="section-panel">
      <div>
        <h2 className="text-base font-semibold">{definition.label}</h2>
        <p className="text-xs text-muted-foreground">{definition.description}</p>
      </div>
      {errorCount > 0 && (
        <p
          role="alert"
          className="border-l-2 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {errorCount === 1 ? "One field needs attention" : `${errorCount} fields need attention`}{" "}
          before this section can be saved.
        </p>
      )}
      <FieldGroupInputs
        fields={definition.fields}
        value={section.props}
        onChange={onPropsChange}
        errors={section.errors}
        idPrefix={`s-${section.id.slice(0, 8)}-`}
      />

      <fieldset className="space-y-4 border-t pt-5">
        <legend className="mb-3 text-sm font-semibold">Section settings</legend>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor={`bg-${section.id}`} className="text-sm font-medium">
              Background
            </label>
            <Select
              items={backgrounds}
              value={section.background}
              onValueChange={(v) => onSettingsChange({ background: v as SectionBackground })}
              disabled={readOnly}
            >
              <SelectTrigger id={`bg-${section.id}`} className="h-9 w-full data-[size=default]:h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {backgrounds.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor={`pad-${section.id}`} className="text-sm font-medium">
              Spacing
            </label>
            <Select
              items={paddings}
              value={section.padding}
              onValueChange={(v) => onSettingsChange({ padding: String(v) })}
              disabled={readOnly}
            >
              <SelectTrigger
                id={`pad-${section.id}`}
                className="h-9 w-full data-[size=default]:h-9"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {paddings.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor={`anchor-${section.id}`} className="text-sm font-medium">
            Anchor ID
          </label>
          <Input
            id={`anchor-${section.id}`}
            value={section.anchorId ?? ""}
            onChange={(e) => onSettingsChange({ anchorId: e.target.value || null })}
            placeholder="e.g. services"
            disabled={readOnly}
            className="h-9"
            aria-invalid={Boolean(section.errors.anchorId)}
          />
          <p
            className={
              section.errors.anchorId ? "text-xs text-destructive" : "text-xs text-muted-foreground"
            }
          >
            {section.errors.anchorId ?? "Lets links jump to this section (#services)."}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={`hidden-${section.id}`} className="text-sm font-medium">
            Hide this section
          </label>
          <Switch
            id={`hidden-${section.id}`}
            checked={section.isHidden}
            onCheckedChange={(v) => onSettingsChange({ isHidden: v })}
            disabled={readOnly}
          />
        </div>
      </fieldset>
    </div>
  );
}
