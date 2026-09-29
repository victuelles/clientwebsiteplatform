"use client";

import { CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { SiteIcon } from "@/core/icons/icon";
import { cn } from "@/lib/utils";

import { setModuleEnabled } from "../actions";
import type { ModuleCardData } from "../data";

function Met({ met }: { met: boolean }) {
  return met ? (
    <CircleCheck aria-label="Met" className="size-4 shrink-0 text-success" />
  ) : (
    <CircleX aria-label="Not met" className="size-4 shrink-0 text-destructive" />
  );
}

function Summary({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="font-medium text-foreground">{title}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

export function ModuleCard({ card }: { card: ModuleCardData }) {
  const [dialog, setDialog] = useState<"enable" | "disable" | null>(null);
  const [understood, setUnderstood] = useState(false);
  const [pending, startTransition] = useTransition();

  const status = !card.enabled ? "Off" : card.health.length ? "On with warnings" : "On";
  const switchBlocked = card.enabled ? card.disableBlocked : card.enableBlocked;

  function confirm() {
    const enabled = dialog === "enable";
    startTransition(async () => {
      const result = await setModuleEnabled({ key: card.key, enabled });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDialog(null);
      setUnderstood(false);
      toast.success(`${card.label} is now ${enabled ? "on" : "off"}.`);
    });
  }

  const appears = [
    ...card.appears.publicRoutes.map((route) => `Public page ${route}`),
    ...card.appears.adminNav.map((label) => `Admin menu item “${label}”`),
    ...card.appears.accountNav.map((label) => `Account page “${label}”`),
    ...card.appears.sectionTypes.map((label) => `Section type “${label}”`),
    ...card.appears.feeds.map((label) => `“${label}” in the Module feed section`),
  ];

  return (
    <Card className="w-full ring-border" data-testid={`module-card-${card.key}`}>
      <CardHeader className="flex flex-row items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-accent">
          <SiteIcon name={card.icon} className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            {card.label}
            <Badge
              variant="outline"
              data-testid="module-status"
              className={cn(
                card.enabled && !card.health.length && "text-success",
                card.health.length > 0 && "text-accent",
                !card.enabled && "text-muted-foreground",
              )}
            >
              {status}
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground">{card.description}</p>
        </div>
        <Switch
          checked={card.enabled}
          disabled={Boolean(switchBlocked) || pending}
          aria-label={`${card.enabled ? "Turn off" : "Turn on"} ${card.label}`}
          onCheckedChange={(checked) => setDialog(checked ? "enable" : "disable")}
        />
      </CardHeader>

      <CardContent className="flex-1 space-y-4 text-sm">
        {switchBlocked && (
          <p className="flex gap-2 rounded-md bg-muted p-3" data-testid="module-blocked">
            <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
            <span>
              {switchBlocked}
              {!card.enabled && card.integrations.some((i) => !i.met) && (
                <>
                  {" "}
                  <Link href={card.integrations[0]!.href} className="font-medium underline">
                    Open Integrations
                  </Link>
                </>
              )}
            </span>
          </p>
        )}

        {card.health.map((warning) => (
          <p key={warning.message} className="flex gap-2 text-accent">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {warning.message}{" "}
              {warning.href && (
                <Link href={warning.href} className="font-medium underline">
                  Fix this
                </Link>
              )}
            </span>
          </p>
        ))}

        {(card.requires.length > 0 || card.integrations.length > 0) && (
          <div>
            <p className="font-medium">Requires</p>
            <ul className="mt-1 space-y-1">
              {card.requires.map((item) => (
                <li key={item.key} className="flex items-center gap-2">
                  <Met met={item.met} /> {item.label} module
                </li>
              ))}
              {card.integrations.map((item) => (
                <li key={item.key} className="flex flex-wrap items-center gap-2">
                  <Met met={item.met} /> {item.label}
                  {!item.met && (
                    <Link href={item.href} className="text-xs underline">
                      Set up in Integrations
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.optionalIntegrations.length > 0 && (
          <div>
            <p className="font-medium">Optional</p>
            <ul className="mt-1 space-y-1 text-muted-foreground">
              {card.optionalIntegrations.map((item) => (
                <li key={item.key}>
                  {item.label} ({item.met ? "configured" : "not configured"}): {item.unlocks}
                </li>
              ))}
            </ul>
          </div>
        )}

        {card.worksWith.length > 0 && (
          <p className="text-muted-foreground">
            Works with{" "}
            {card.worksWith.map((m) => `${m.label}${m.enabled ? "" : " (off)"}`).join(", ")}
          </p>
        )}
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/admin/m/${card.key}`} />}
        >
          Open
        </Button>
        <Button
          variant="ghost"
          size="sm"
          nativeButton={false}
          render={<Link href={`/admin/modules/${card.key}/settings`} />}
        >
          Settings
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">Built in Phase {card.phase}</span>
      </CardFooter>

      <AlertDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto data-[size=default]:max-w-[calc(100%-2rem)] data-[size=default]:sm:max-w-lg">
          {dialog === "enable" ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Turn on {card.label}?</AlertDialogTitle>
                <AlertDialogDescription render={<div />} className="space-y-3 text-left">
                  <p>
                    Staff with {card.label} permissions can use it right away
                    {card.appears.publicRoutes.length > 0
                      ? ", and visitors see its public pages."
                      : ". It has no public pages; it adds admin tools only."}
                  </p>
                  <Summary title="What appears" items={appears} />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <Button onClick={confirm} disabled={pending}>
                  Turn on
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>Turn off {card.label}?</AlertDialogTitle>
                <AlertDialogDescription render={<div />} className="space-y-3 text-left">
                  <p>
                    Its public pages will show “page not found”, staff lose access to it, and
                    nothing can be created, changed, or deleted, including by you. Links and
                    sections that point to it are hidden. Its data is kept exactly as it is, and
                    turning it back on restores everything.
                  </p>
                  <Summary
                    title="Data kept"
                    items={
                      card.dataSummary.length
                        ? card.dataSummary.map((d) => `${d.count} ${d.label}`)
                        : ["No data yet"]
                    }
                  />
                  <Summary title="Hidden while it's off" items={card.hiddenItems} />
                </AlertDialogDescription>
              </AlertDialogHeader>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={understood}
                  onCheckedChange={(checked) => setUnderstood(checked === true)}
                  className="mt-0.5"
                />
                I understand this hides the module but keeps its data.
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
                <Button variant="destructive" onClick={confirm} disabled={!understood || pending}>
                  Turn off
                </Button>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
