"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Controller, useFieldArray } from "react-hook-form";

import { MediaPicker } from "@/components/media/media-picker";
import { FormTextField } from "@/components/shared/form-text-field";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MediaAsset } from "@/core/media/types";
import type { SettingsSection, SettingsSectionInput } from "@/core/settings/schemas";
import { SOCIAL_PLATFORMS } from "@/core/settings/social";

import { FieldSection, SwitchField, TextareaField } from "./fields";
import { SectionForm } from "./section-form";

type DirtyHandler = (section: SettingsSection, dirty: boolean) => void;

export function GeneralTab({
  values,
  onDirtyChange,
}: {
  values: SettingsSectionInput<"general">;
  onDirtyChange: DirtyHandler;
}) {
  return (
    <SectionForm section="general" defaultValues={values} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldSection title="General" description="How the site introduces itself.">
          <FieldGroup>
            <FormTextField control={form.control} name="siteName" label="Site name" />
            <FormTextField
              control={form.control}
              name="tagline"
              label="Tagline"
              description="A short line, e.g. “A different kind of partner”."
            />
            <TextareaField
              control={form.control}
              name="description"
              label="Description"
              description="Shown in the footer and used as the default search description."
              maxLength={500}
            />
          </FieldGroup>
        </FieldSection>
      )}
    </SectionForm>
  );
}

export function ContactTab({
  values,
  onDirtyChange,
}: {
  values: SettingsSectionInput<"contact">;
  onDirtyChange: DirtyHandler;
}) {
  return (
    <SectionForm section="contact" defaultValues={values} onDirtyChange={onDirtyChange}>
      {(form) => (
        <FieldSection title="Contact" description="Shown in the top bar and the footer.">
          <FieldGroup>
            <FormTextField control={form.control} name="contactEmail" label="Email" type="email" />
            <FormTextField control={form.control} name="phone" label="Phone" type="tel" />
            <FormTextField
              control={form.control}
              name="locationLabel"
              label="Location label"
              description="Short, e.g. “San Francisco Bay Area, CA”."
            />
            <TextareaField
              control={form.control}
              name="address"
              label="Full address"
              rows={2}
              maxLength={300}
            />
            <FormTextField
              control={form.control}
              name="mapUrl"
              label="Map link"
              description="A full https:// link to Google Maps or similar."
            />
          </FieldGroup>
        </FieldSection>
      )}
    </SectionForm>
  );
}

export function HeaderFooterTab({
  values,
  onDirtyChange,
}: {
  values: SettingsSectionInput<"headerFooter">;
  onDirtyChange: DirtyHandler;
}) {
  return (
    <SectionForm section="headerFooter" defaultValues={values} onDirtyChange={onDirtyChange}>
      {(form) => (
        <>
          <FieldSection title="Header">
            <FieldGroup>
              <SwitchField
                control={form.control}
                name="showTopBar"
                label="Show the top bar"
                description="The thin bar above the header with phone, email, and location."
              />
              <FormTextField
                control={form.control}
                name="headerCtaLabel"
                label="Header button label"
                description="Leave empty to hide the button."
              />
              <FormTextField
                control={form.control}
                name="headerCtaHref"
                label="Header button link"
                description="A path like /contact, or a full https:// link."
              />
            </FieldGroup>
          </FieldSection>
          <FieldSection title="Footer">
            <FieldGroup>
              <FormTextField
                control={form.control}
                name="footerCopyright"
                label="Copyright line"
                description="{year} is replaced with the current year."
              />
              <FormTextField
                control={form.control}
                name="privacyHref"
                label="Privacy policy link"
              />
              <FormTextField control={form.control} name="termsHref" label="Terms of use link" />
            </FieldGroup>
          </FieldSection>
        </>
      )}
    </SectionForm>
  );
}

const PLATFORM_ITEMS = SOCIAL_PLATFORMS.map((p) => ({ value: p.key, label: p.label }));

export function SocialTab({
  values,
  onDirtyChange,
}: {
  values: SettingsSectionInput<"social">;
  onDirtyChange: DirtyHandler;
}) {
  return (
    <SectionForm section="social" defaultValues={values} onDirtyChange={onDirtyChange}>
      {(form) => <SocialLinksEditor form={form} />}
    </SectionForm>
  );
}

function SocialLinksEditor({
  form,
}: {
  form: Parameters<Parameters<typeof SectionForm<"social">>[0]["children"]>[0];
}) {
  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: "socialLinks",
  });
  return (
    <FieldSection
      title="Social links"
      description="Shown as icon buttons in the footer, in this order."
    >
      {fields.length === 0 && <p className="text-sm text-muted-foreground">No social links yet.</p>}
      <ol className="space-y-3">
        {fields.map((field, index) => (
          <li
            key={field.id}
            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start"
          >
            <Controller
              control={form.control}
              name={`socialLinks.${index}.platform`}
              render={({ field: platform }) => (
                <Select
                  items={PLATFORM_ITEMS}
                  value={platform.value}
                  onValueChange={(v) => platform.onChange(v)}
                >
                  <SelectTrigger
                    aria-label={`Platform for link ${index + 1}`}
                    className="h-10 w-full data-[size=default]:h-10"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_ITEMS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              control={form.control}
              name={`socialLinks.${index}.url`}
              render={({ field: url, fieldState }) => (
                <div className="space-y-1">
                  <Input
                    {...url}
                    aria-label={`Link ${index + 1}`}
                    aria-invalid={fieldState.invalid}
                    placeholder="https://…, an email, or a phone number"
                    className="h-10"
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </div>
              )}
            />
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move link ${index + 1} up`}
                disabled={index === 0}
                onClick={() => move(index, index - 1)}
              >
                <ArrowUp aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Move link ${index + 1} down`}
                disabled={index === fields.length - 1}
                onClick={() => move(index, index + 1)}
              >
                <ArrowDown aria-hidden />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove link ${index + 1}`}
                onClick={() => remove(index)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      <Button
        type="button"
        variant="outline"
        onClick={() => append({ platform: "linkedin", url: "" })}
        disabled={fields.length >= 12}
      >
        <Plus aria-hidden />
        Add social link
      </Button>
    </FieldSection>
  );
}

export function SeoTab({
  values,
  assets,
  onDirtyChange,
}: {
  values: SettingsSectionInput<"seo">;
  assets: Record<string, MediaAsset>;
  onDirtyChange: DirtyHandler;
}) {
  const [picked, setPicked] = useState<Record<string, MediaAsset>>(assets);
  const [confirm, setConfirm] = useState<{ next: boolean; apply: () => void } | null>(null);

  return (
    <SectionForm section="seo" defaultValues={values} onDirtyChange={onDirtyChange}>
      {(form) => (
        <>
          <FieldSection
            title="Search and sharing"
            description="Defaults for every page. Pages can override them later."
          >
            <FieldGroup>
              <FormTextField
                control={form.control}
                name="seoTitleTemplate"
                label="Title template"
                description="%s is replaced with the page title, e.g. “%s | North / Co”."
              />
              <TextareaField
                control={form.control}
                name="seoDescription"
                label="Default description"
                description="Shown in search results. Leave empty to use the site description."
                maxLength={300}
              />
              <Controller
                control={form.control}
                name="ogImageMediaId"
                render={({ field }) => (
                  <div className="space-y-2">
                    <FieldLabel>Default share image</FieldLabel>
                    <MediaPicker
                      id="og-image"
                      label="Share image"
                      value={field.value ? (picked[field.value] ?? null) : null}
                      onChange={(asset) => {
                        if (asset) setPicked((p) => ({ ...p, [asset.id]: asset }));
                        field.onChange(asset?.id ?? null);
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Used when a page is shared on social media. 1200×630 works best.
                    </p>
                  </div>
                )}
              />
            </FieldGroup>
          </FieldSection>
          <FieldSection title="Search engines">
            <SwitchField
              control={form.control}
              name="allowIndexing"
              label="Allow search engines to index this site"
              description="Keep this off until the site launches."
              onBeforeChange={(next, apply) => {
                setConfirm({ next, apply });
                return false;
              }}
            />
          </FieldSection>
          <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {confirm?.next
                    ? "Let search engines index this site?"
                    : "Hide this site from search engines?"}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {confirm?.next
                    ? "Search engines will be allowed to crawl and list every public page. Only do this when the site is ready to launch."
                    : "Search engines will be asked to stop listing this site. Pages already in search results can take weeks to disappear."}{" "}
                  The change takes effect when you save.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    confirm?.apply();
                    setConfirm(null);
                  }}
                >
                  {confirm?.next ? "Allow indexing" : "Hide from search engines"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </SectionForm>
  );
}
