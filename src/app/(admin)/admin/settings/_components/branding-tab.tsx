"use client";

import { ArrowUpRight, Check, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Controller, useWatch, type Control } from "react-hook-form";

import { MediaPicker } from "@/components/media/media-picker";
import { Eyebrow } from "@/components/shared/eyebrow";
import { Logo } from "@/components/site/logo";
import { Button } from "@/components/ui/button";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MediaAsset } from "@/core/media/types";
import { checkAccentContrast, isHexColor, type ContrastResult } from "@/core/settings/color";
import { FONTS } from "@/core/settings/fonts";
import type { SettingsSection, SettingsSectionInput } from "@/core/settings/schemas";
import { DEFAULT_THEME, themeSchema, themeToCssVariables, type Theme } from "@/core/settings/theme";
import { cn } from "@/lib/utils";

import { FieldSection } from "./fields";
import { SectionForm } from "./section-form";

type Values = SettingsSectionInput<"branding">;

const COLOR_FIELDS: { key: keyof Theme["colors"]; label: string; hint: string }[] = [
  { key: "accent", label: "Accent", hint: "Buttons, eyebrows, highlights" },
  { key: "navy", label: "Dark", hint: "Header, footer, dark sections" },
  { key: "background", label: "Background", hint: "Page background" },
  { key: "foreground", label: "Text", hint: "Headings and body text" },
  { key: "muted", label: "Light section", hint: "Alternate section background" },
  { key: "mutedForeground", label: "Secondary text", hint: "Descriptions and captions" },
  { key: "border", label: "Border", hint: "Lines and card edges" },
];

const FONT_ITEMS = FONTS.map((f) => ({ value: f.key, label: `${f.label} (${f.category})` }));

const RADIUS_ITEMS = [
  { value: "0", label: "Square" },
  { value: "0.125", label: "Subtle (design default)" },
  { value: "0.25", label: "Small" },
  { value: "0.5", label: "Medium" },
  { value: "0.75", label: "Large" },
  { value: "1", label: "Round" },
];

export function BrandingTab({
  values,
  assets,
  siteName,
  onDirtyChange,
}: {
  values: Values;
  assets: Record<string, MediaAsset>;
  siteName: string;
  onDirtyChange: (section: SettingsSection, dirty: boolean) => void;
}) {
  const [picked, setPicked] = useState<Record<string, MediaAsset>>(assets);

  const picker = (
    control: Control<Values>,
    name: "logoMediaId" | "logoOnDarkMediaId" | "faviconMediaId",
    label: string,
    hint: string,
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className="space-y-2">
          <FieldLabel>{label}</FieldLabel>
          <MediaPicker
            id={name}
            label={label}
            value={field.value ? (picked[field.value] ?? null) : null}
            onChange={(asset) => {
              if (asset) setPicked((p) => ({ ...p, [asset.id]: asset }));
              field.onChange(asset?.id ?? null);
            }}
          />
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
      )}
    />
  );

  return (
    <SectionForm
      section="branding"
      defaultValues={values}
      onDirtyChange={onDirtyChange}
      aside={(form) => (
        <ThemePreview
          control={form.control as unknown as Control<Values>}
          siteName={siteName}
          assets={picked}
        />
      )}
    >
      {(form) => {
        const control = form.control as unknown as Control<Values>;
        return (
          <>
            <FieldSection
              title="Logos"
              description="Without a logo, the site shows its name next to an accent mark."
            >
              <FieldGroup>
                {picker(
                  control,
                  "logoMediaId",
                  "Logo",
                  "For light backgrounds. SVG or a transparent PNG works best.",
                )}
                {picker(
                  control,
                  "logoOnDarkMediaId",
                  "Logo on dark backgrounds",
                  "Used in the navy header and footer.",
                )}
                {picker(control, "faviconMediaId", "Favicon", "A square image, at least 64×64.")}
              </FieldGroup>
            </FieldSection>

            <FieldSection title="Colors">
              <div className="grid gap-4 sm:grid-cols-2">
                {COLOR_FIELDS.map((color) => (
                  <ColorField
                    key={color.key}
                    control={control}
                    name={color.key}
                    label={color.label}
                    hint={color.hint}
                  />
                ))}
              </div>
            </FieldSection>

            <FieldSection title="Typography and shape">
              <div className="grid gap-4 sm:grid-cols-3">
                {(["heading", "body"] as const).map((which) => (
                  <Controller
                    key={which}
                    control={control}
                    name={`theme.fonts.${which}`}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <FieldLabel htmlFor={`font-${which}`}>
                          {which === "heading" ? "Heading font" : "Body font"}
                        </FieldLabel>
                        <Select
                          items={FONT_ITEMS}
                          value={field.value}
                          onValueChange={(v) => field.onChange(v)}
                        >
                          <SelectTrigger
                            id={`font-${which}`}
                            className="h-10 w-full data-[size=default]:h-10"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {FONT_ITEMS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  />
                ))}
                <Controller
                  control={control}
                  name="theme.radius"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <FieldLabel htmlFor="radius">Corners</FieldLabel>
                      <Select
                        items={RADIUS_ITEMS}
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(Number(v))}
                      >
                        <SelectTrigger id="radius" className="h-10 w-full data-[size=default]:h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RADIUS_ITEMS.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                              {item.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                />
              </div>
            </FieldSection>

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                form.setValue("theme", DEFAULT_THEME as never, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            >
              <RotateCcw aria-hidden />
              Reset colors and fonts to defaults
            </Button>
          </>
        );
      }}
    </SectionForm>
  );
}

function ColorField({
  control,
  name,
  label,
  hint,
}: {
  control: Control<Values>;
  name: keyof Theme["colors"];
  label: string;
  hint: string;
}) {
  return (
    <Controller
      control={control}
      name={`theme.colors.${name}`}
      render={({ field, fieldState }) => {
        const valid = isHexColor(field.value ?? "");
        return (
          <div className="space-y-1.5">
            <FieldLabel htmlFor={`color-${name}`}>{label}</FieldLabel>
            <div className="flex gap-2">
              <input
                type="color"
                aria-label={`${label} color picker`}
                value={valid ? field.value : "#000000"}
                onChange={(e) => field.onChange(e.target.value)}
                className="h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-background p-1"
              />
              <Input
                id={`color-${name}`}
                value={field.value ?? ""}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                aria-invalid={fieldState.invalid}
                className="h-10 font-mono"
                maxLength={7}
                spellCheck={false}
              />
            </div>
            <p
              className={cn(
                "text-xs",
                fieldState.invalid ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {fieldState.invalid ? "Use a 6-digit hex color like #ed573d." : hint}
            </p>
          </div>
        );
      }}
    />
  );
}

function ContrastRow({ label, result }: { label: string; result: ContrastResult }) {
  const Icon = result.aa ? Check : result.aaLarge ? Check : X;
  return (
    <li className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span
        className={cn(
          "flex items-center gap-1 font-medium tabular-nums",
          result.aa ? "text-success" : result.aaLarge ? "text-foreground" : "text-destructive",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        {result.ratio.toFixed(2)}:1 ·{" "}
        {result.aa ? "AA" : result.aaLarge ? "AA large text only" : "Fails AA"}
      </span>
    </li>
  );
}

/** Renders the design's building blocks with the unsaved theme values. */
function ThemePreview({
  control,
  siteName,
  assets,
}: {
  control: Control<Values>;
  siteName: string;
  assets: Record<string, MediaAsset>;
}) {
  const theme = useWatch({ control, name: "theme" });
  const logoOnDarkId = useWatch({ control, name: "logoOnDarkMediaId" });
  const parsed = themeSchema.safeParse(theme);
  const effective: Theme = parsed.success
    ? parsed.data
    : ({
        ...DEFAULT_THEME,
        ...theme,
        colors: Object.fromEntries(
          Object.entries(DEFAULT_THEME.colors).map(([key, fallback]) => {
            const value = (theme?.colors as Record<string, string> | undefined)?.[key];
            return [key, value && isHexColor(value) ? value.toLowerCase() : fallback];
          }),
        ) as Theme["colors"],
      } as Theme);
  const contrast = checkAccentContrast(effective.colors.accent, effective.colors.background);
  const logo = logoOnDarkId ? assets[logoOnDarkId] : null;

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Live preview</p>
      <div
        data-testid="theme-preview"
        style={themeToCssVariables(effective) as React.CSSProperties}
        className="overflow-hidden rounded-lg border bg-background font-sans text-foreground"
      >
        <div className="flex items-center justify-between gap-3 bg-navy px-4 py-3">
          <Logo
            siteName={siteName}
            asset={logo}
            tone="dark"
            className="[&_span:last-child]:text-sm"
          />
          <span className="inline-flex h-8 items-center gap-1 rounded-lg bg-accent px-3 text-[10px] font-semibold tracking-widest text-accent-foreground uppercase">
            Let&apos;s talk <ArrowUpRight aria-hidden className="size-3" />
          </span>
        </div>
        <div className="space-y-4 bg-muted p-5">
          <Eyebrow>What we do</Eyebrow>
          <p className="font-heading text-2xl leading-tight font-bold">
            Good ideas deserve <span className="text-accent">great execution.</span>
          </p>
          <p className="text-sm text-muted-foreground">
            Clear thinking and practical solutions, beside you.
          </p>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-[10px] font-semibold tracking-widest text-accent-foreground uppercase">
              Accent button
            </span>
            <span className="inline-flex h-9 items-center rounded-lg bg-navy px-4 text-[10px] font-semibold tracking-widest text-navy-foreground uppercase">
              Dark button
            </span>
          </div>
          <div className="rounded-lg border bg-background p-4">
            <p className="font-heading font-semibold">Growth Strategy</p>
            <p className="text-sm text-muted-foreground">
              Find opportunities and build a practical plan.
            </p>
          </div>
        </div>
      </div>
      <div className="rounded-lg border p-3 text-sm">
        <p className="mb-2 font-medium">Contrast (WCAG)</p>
        <ul className="space-y-1.5">
          <ContrastRow label="Accent text on background" result={contrast.accentOnPage} />
          <ContrastRow label="White text on accent" result={contrast.whiteOnAccent} />
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          AA needs 4.5:1 for normal text and 3:1 for large or bold text, like buttons.
        </p>
      </div>
    </div>
  );
}
