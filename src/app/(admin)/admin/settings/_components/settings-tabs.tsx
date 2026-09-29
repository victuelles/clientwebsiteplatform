"use client";

import { useCallback, useState } from "react";

import { useUnsavedChangesWarning } from "@/components/shared/use-unsaved-changes";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { MediaAsset } from "@/core/media/types";
import type { SettingsSection, SettingsSectionInput } from "@/core/settings/schemas";

import { BrandingTab } from "./branding-tab";
import { ContactTab, GeneralTab, HeaderFooterTab, SeoTab, SocialTab } from "./simple-tabs";

export type SettingsFormValues = { [S in SettingsSection]: SettingsSectionInput<S> };

const TABS: { value: SettingsSection | "integrations"; label: string }[] = [
  { value: "general", label: "General" },
  { value: "contact", label: "Contact" },
  { value: "branding", label: "Branding" },
  { value: "headerFooter", label: "Header & footer" },
  { value: "social", label: "Social" },
  { value: "seo", label: "SEO" },
  { value: "integrations", label: "Integrations" },
];

export function SettingsTabs({
  values,
  assets,
  integrations,
  initialTab = "general",
}: {
  values: SettingsFormValues;
  assets: Record<string, MediaAsset>;
  integrations: React.ReactNode;
  /** From ?tab= (e.g. links from the modules screen to Integrations). */
  initialTab?: string;
}) {
  const [dirty, setDirty] = useState<Partial<Record<SettingsSection, boolean>>>({});
  const onDirtyChange = useCallback(
    (section: SettingsSection, isDirty: boolean) =>
      setDirty((d) => (d[section] === isDirty ? d : { ...d, [section]: isDirty })),
    [],
  );
  useUnsavedChangesWarning(Object.values(dirty).some(Boolean));

  return (
    <Tabs
      defaultValue={TABS.some((tab) => tab.value === initialTab) ? initialTab : "general"}
      className="gap-6"
    >
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <TabsList className="w-max">
          {TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5">
              {tab.label}
              {tab.value !== "integrations" && dirty[tab.value] && (
                <span aria-label="unsaved changes" className="size-1.5 rounded-full bg-accent" />
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {/* keepMounted: switching tabs keeps unsaved edits. */}
      <TabsContent value="general" keepMounted>
        <GeneralTab values={values.general} onDirtyChange={onDirtyChange} />
      </TabsContent>
      <TabsContent value="contact" keepMounted>
        <ContactTab values={values.contact} onDirtyChange={onDirtyChange} />
      </TabsContent>
      <TabsContent value="branding" keepMounted>
        <BrandingTab
          values={values.branding}
          assets={assets}
          siteName={values.general.siteName}
          onDirtyChange={onDirtyChange}
        />
      </TabsContent>
      <TabsContent value="headerFooter" keepMounted>
        <HeaderFooterTab values={values.headerFooter} onDirtyChange={onDirtyChange} />
      </TabsContent>
      <TabsContent value="social" keepMounted>
        <SocialTab values={values.social} onDirtyChange={onDirtyChange} />
      </TabsContent>
      <TabsContent value="seo" keepMounted>
        <SeoTab values={values.seo} assets={assets} onDirtyChange={onDirtyChange} />
      </TabsContent>
      <TabsContent value="integrations" keepMounted>
        {integrations}
      </TabsContent>
    </Tabs>
  );
}
