"use client";

import { MediaPicker } from "@/components/media/media-picker";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Link } from "@/core/links/types";
import type { MediaValue } from "@/core/sections/common";
import type { FieldDef } from "@/core/sections/fields";
import type { RichTextDoc } from "@/core/sections/rich-text";
import { cn } from "@/lib/utils";

import { childErrors, useSectionEditor, type FieldErrors } from "./editor-context";
import { IconField } from "./icon-field";
import { LinkField } from "./link-field";
import { ListField } from "./list-field";
import { RichTextField } from "./rich-text-field";

/** One field of a generated section form. `errors` are relative to this field. */
export function FieldInput({
  field,
  value,
  onChange,
  errors,
  idPrefix,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  errors: FieldErrors;
  idPrefix: string;
}) {
  const { readOnly, media, registerMedia } = useSectionEditor();
  const id = `${idPrefix}${field.name}`;
  const error = errors[""];
  const invalid = Boolean(error);

  let control: React.ReactNode;
  switch (field.type) {
    case "text":
      control = (
        <Input
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={readOnly}
          aria-invalid={invalid}
          className="h-9"
        />
      );
      break;
    case "textarea":
      control = (
        <Textarea
          id={id}
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={field.rows ?? 3}
          maxLength={field.maxLength}
          placeholder={field.placeholder}
          disabled={readOnly}
          aria-invalid={invalid}
        />
      );
      break;
    case "richtext":
      control = (
        <RichTextField
          id={id}
          value={value as RichTextDoc}
          onChange={onChange}
          readOnly={readOnly}
          invalid={invalid}
        />
      );
      break;
    case "number":
      control = (
        <Input
          id={id}
          type="number"
          value={value === null || value === undefined ? "" : String(value)}
          min={field.min}
          max={field.max}
          step={field.step}
          onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
          disabled={readOnly}
          aria-invalid={invalid}
          className="h-9 w-32"
        />
      );
      break;
    case "toggle":
      return (
        <div className="flex items-center justify-between gap-3">
          <label htmlFor={id} className="text-sm font-medium">
            {field.label}
          </label>
          <Switch
            id={id}
            checked={Boolean(value)}
            onCheckedChange={(v) => onChange(v)}
            disabled={readOnly}
          />
        </div>
      );
    case "select":
      control = (
        <Select
          items={field.options}
          value={(value as string) ?? field.options[0]?.value}
          onValueChange={(v) => onChange(v)}
          disabled={readOnly}
        >
          <SelectTrigger
            id={id}
            className="h-9 w-full data-[size=default]:h-9"
            aria-invalid={invalid}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
      break;
    case "media": {
      const mediaValue = value as MediaValue | undefined;
      const asset = mediaValue ? (media[mediaValue.mediaId] ?? null) : null;
      control = readOnly ? (
        <p className="text-sm text-muted-foreground">
          {asset ? asset.filename : mediaValue ? "Image (missing)" : "No image"}
        </p>
      ) : (
        <MediaPicker
          id={id}
          label={field.label}
          accept={field.accept ?? "image"}
          value={asset}
          onChange={(picked) => {
            if (picked) registerMedia(picked);
            onChange(picked ? { mediaId: picked.id } : null);
          }}
        />
      );
      break;
    }
    case "link":
      control = (
        <LinkField
          id={id}
          value={value as Link | null}
          onChange={onChange}
          optional={field.optional ?? true}
          invalid={invalid}
        />
      );
      break;
    case "icon":
      control = (
        <IconField
          id={id}
          label={field.label}
          value={value as string}
          onChange={onChange}
          optional={field.optional}
          readOnly={readOnly}
        />
      );
      break;
    case "list":
      return (
        <ListField
          field={field}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          errors={errors}
          idPrefix={id}
        />
      );
  }

  return (
    <div className="space-y-1.5" data-field={field.name}>
      <label htmlFor={id} className="text-sm font-medium">
        {field.label}
      </label>
      {control}
      {field.help && !error && <p className="text-xs text-muted-foreground">{field.help}</p>}
      {error && <p className={cn("text-xs text-destructive")}>{error}</p>}
    </div>
  );
}

/** Renders a list of fields bound to an object value. */
export function FieldGroupInputs({
  fields,
  value,
  onChange,
  errors,
  idPrefix,
}: {
  fields: FieldDef[];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
  errors: FieldErrors;
  idPrefix: string;
}) {
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <FieldInput
          key={field.name}
          field={field}
          value={value[field.name]}
          onChange={(next) => onChange({ ...value, [field.name]: next })}
          errors={childErrors(errors, field.name)}
          idPrefix={idPrefix}
        />
      ))}
    </div>
  );
}
