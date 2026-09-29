"use client";

import {
  ArrowLeft,
  CircleAlert,
  CircleCheck,
  ExternalLink,
  History,
  Loader2,
  Settings2,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  SectionEditorProvider,
  type EditorPage,
  type SectionEditorContextValue,
} from "@/components/section-editor/editor-context";
import { zodFieldErrors } from "@/components/section-editor/zod-errors";
import { useUnsavedChangesWarning } from "@/components/shared/use-unsaved-changes";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/core/access/permissions-provider";
import type { MediaAsset } from "@/core/media/types";
import { countSectionChanges, draftSnapshot } from "@/core/pages/draft-diff";
import { anchorIdSchema } from "@/core/sections/common";
import { getSectionDefinition } from "@/core/sections/registry";
import type { SectionRecord } from "@/core/sections/types";
import { cn } from "@/lib/utils";

import {
  addSection,
  deleteSection,
  discardDraft,
  duplicateSection,
  publishPage,
  reorderSections,
  restoreRevision,
  unpublishPage,
  updateSection,
  type EditorSection,
} from "../../../actions";
import { AddSectionDialog } from "./add-section-dialog";
import { HistorySheet } from "./history-sheet";
import { PageSettingsDialog } from "./page-settings-dialog";
import { PreviewFrame } from "./preview-frame";
import { SectionPanel, type SettingsPatch } from "./section-panel";
import { SectionList, sectionSummary } from "./section-list";
import type { EditorPageMeta, RevisionSummary, SectionState } from "./types";

const AUTOSAVE_MS = 700;

type Confirm =
  | { kind: "publish" }
  | { kind: "unpublish" }
  | { kind: "discard" }
  | { kind: "delete"; sectionId: string }
  | { kind: "restore"; revision: RevisionSummary }
  | null;

function validate(section: Pick<SectionState, "type" | "props" | "anchorId">) {
  const definition = getSectionDefinition(section.type);
  const errors = definition
    ? (() => {
        const parsed = definition.schema.safeParse(section.props);
        return parsed.success ? {} : zodFieldErrors(parsed.error);
      })()
    : { "": "Unknown section type." };
  const anchor = anchorIdSchema.safeParse(section.anchorId ?? "");
  if (!anchor.success) errors.anchorId = anchor.error.issues[0]?.message ?? "Invalid anchor.";
  return errors;
}

function toState(section: EditorSection): SectionState {
  return { ...section, status: "saved", errors: validate(section) };
}

export function PageEditor({
  page,
  initialSections,
  published,
  revisions,
  pages,
  media: initialMedia,
  modules,
  feedSources,
  ogImage,
}: {
  page: EditorPageMeta;
  initialSections: EditorSection[];
  published: SectionRecord[];
  revisions: RevisionSummary[];
  pages: EditorPage[];
  media: Record<string, MediaAsset>;
  modules: Record<string, boolean>;
  feedSources: { value: string; label: string }[];
  ogImage: MediaAsset | null;
}) {
  const router = useRouter();
  const { can } = usePermissions(); // UI hiding only; actions and RLS enforce.
  const canEdit = can("content", "edit");
  const canPublish = can("content", "publish");
  const readOnly = !canEdit;

  const [sections, setSections] = useState<SectionState[]>(() => initialSections.map(toState));
  const [publishedSnapshot, setPublishedSnapshot] = useState<SectionRecord[]>(published);
  const [isPublished, setIsPublished] = useState(page.published);
  const [selectedId, setSelectedId] = useState<string | null>(initialSections[0]?.id ?? null);
  const [media, setMedia] = useState(initialMedia);
  const [panel, setPanel] = useState<"sections" | "edit" | "preview">("sections");
  const [addOpen, setAddOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [busy, startBusy] = useTransition();

  const frameRef = useRef<HTMLIFrameElement>(null);
  const latest = useRef(sections);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const inFlight = useRef(new Set<string>());
  useEffect(() => {
    latest.current = sections;
  }, [sections]);

  const post = useCallback((message: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage(
      { source: "cwp-editor", ...message },
      window.location.origin,
    );
  }, []);
  const refreshPreview = useCallback(() => post({ type: "refresh" }), [post]);

  const patch = useCallback((id: string, update: Partial<SectionState>) => {
    setSections((current) => current.map((s) => (s.id === id ? { ...s, ...update } : s)));
  }, []);

  // ---- Autosave -------------------------------------------------------------------------------

  // Retries go through a ref so save() doesn't reference itself before it's declared.
  const saveRef = useRef<(id: string) => Promise<void>>(async () => {});
  const save = useCallback(
    async (id: string) => {
      const section = latest.current.find((s) => s.id === id);
      if (!section || Object.keys(section.errors).length) return;
      if (inFlight.current.has(id)) {
        timers.current.set(
          id,
          setTimeout(() => void saveRef.current(id), AUTOSAVE_MS),
        );
        return;
      }
      inFlight.current.add(id);
      patch(id, { status: "saving", saveError: undefined });
      // Raw values: the server validates (and normalizes) them once.
      const settings = {
        background: section.background,
        padding: section.padding,
        anchorId: section.anchorId ?? "",
        isHidden: section.isHidden,
      };
      const snapshot = section;
      const result = await updateSection({
        pageId: page.id,
        sectionId: id,
        props: section.props,
        settings,
      });
      inFlight.current.delete(id);
      const current = latest.current.find((s) => s.id === id);
      if (!result.ok) {
        patch(id, { status: "error", saveError: result.error });
        return;
      }
      // Newer edits arrived while saving: they are still "dirty" and have their own timer.
      if (current && current !== snapshot && current.status !== "saving") return;
      patch(id, { status: "saved" });
      refreshPreview();
    },
    [page.id, patch, refreshPreview],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  const scheduleSave = useCallback(
    (id: string) => {
      clearTimeout(timers.current.get(id));
      timers.current.set(
        id,
        setTimeout(() => void save(id), AUTOSAVE_MS),
      );
    },
    [save],
  );

  const edit = useCallback(
    (
      id: string,
      update: Partial<
        Pick<SectionState, "props" | "background" | "padding" | "anchorId" | "isHidden">
      >,
    ) => {
      setSections((current) =>
        current.map((s) => {
          if (s.id !== id) return s;
          const next = { ...s, ...update };
          const errors = validate(next);
          return { ...next, errors, status: Object.keys(errors).length ? "invalid" : "dirty" };
        }),
      );
      scheduleSave(id);
    },
    [scheduleSave],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => clearTimeout(timer));
  }, []);

  const unsaved = sections.some((s) => s.status !== "saved");
  useUnsavedChangesWarning(unsaved);

  const status = sections.some((s) => s.status === "saving")
    ? "saving"
    : sections.some((s) => s.status === "error")
      ? "error"
      : sections.some((s) => s.status === "invalid")
        ? "invalid"
        : sections.some((s) => s.status === "dirty")
          ? "dirty"
          : "saved";

  // ---- Structure ----------------------------------------------------------------------------

  function select(id: string) {
    setSelectedId(id);
    setPanel("edit");
    post({ type: "select", id });
  }

  const onPreviewSelect = useCallback((id: string) => {
    setSelectedId(id);
    setPanel((p) => (p === "preview" ? p : "edit"));
  }, []);

  function run<T>(
    action: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>,
    then: (data: T) => void,
    success?: string,
  ) {
    startBusy(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      then(result.data);
      if (success) toast.success(success);
    });
  }

  function reorder(ids: string[]) {
    const previous = sections;
    setSections((current) => ids.map((id) => current.find((s) => s.id === id)!).filter(Boolean));
    startBusy(async () => {
      const result = await reorderSections({ pageId: page.id, orderedIds: ids });
      if (!result.ok) {
        setSections(previous);
        toast.error(result.error);
        return;
      }
      refreshPreview();
    });
  }

  function add(type: string) {
    setAddOpen(false);
    run(
      () => addSection({ pageId: page.id, type, afterSectionId: selectedId }),
      (section) => {
        setSections((current) => {
          const index = selectedId ? current.findIndex((s) => s.id === selectedId) : -1;
          const next = [...current];
          next.splice(index >= 0 ? index + 1 : next.length, 0, toState(section));
          return next;
        });
        select(section.id);
        refreshPreview();
      },
      "Section added.",
    );
  }

  function duplicate(id: string) {
    run(
      () => duplicateSection({ pageId: page.id, sectionId: id }),
      (section) => {
        setSections((current) => {
          const next = [...current];
          next.splice(next.findIndex((s) => s.id === id) + 1, 0, toState(section));
          return next;
        });
        select(section.id);
        refreshPreview();
      },
      "Section duplicated.",
    );
  }

  function remove(id: string) {
    clearTimeout(timers.current.get(id));
    run(
      () => deleteSection({ pageId: page.id, sectionId: id }),
      () => {
        setSections((current) => current.filter((s) => s.id !== id));
        if (selectedId === id) setSelectedId(null);
        refreshPreview();
      },
      "Section deleted.",
    );
  }

  const changes = useMemo(
    () => countSectionChanges(draftSnapshot(sections), publishedSnapshot),
    [sections, publishedSnapshot],
  );
  const hasChanges = !isPublished || changes > 0;

  function afterConfirm(current: NonNullable<Confirm>) {
    setConfirm(null);
    if (current.kind === "delete") return remove(current.sectionId);
    if (current.kind === "publish")
      return run(
        () => publishPage({ pageId: page.id }),
        () => {
          setPublishedSnapshot(draftSnapshot(latest.current));
          setIsPublished(true);
          router.refresh();
        },
        "Published. The live page is updated.",
      );
    if (current.kind === "unpublish")
      return run(
        () => unpublishPage({ pageId: page.id }),
        () => {
          setIsPublished(false);
          router.refresh();
        },
        "Unpublished. The page is no longer public.",
      );
    // Discard and restore replace the whole draft: reload to start from the new draft.
    if (current.kind === "discard")
      return run(
        () => discardDraft({ pageId: page.id }),
        () => window.location.reload(),
        "Draft changes discarded.",
      );
    if (current.kind === "restore")
      return run(
        () => restoreRevision({ pageId: page.id, revisionId: current.revision.id }),
        () => window.location.reload(),
        "Version restored to the draft.",
      );
  }

  const selected = sections.find((s) => s.id === selectedId) ?? null;
  const editorContext: SectionEditorContextValue = useMemo(
    () => ({
      readOnly,
      pages,
      media,
      registerMedia: (asset) => setMedia((m) => ({ ...m, [asset.id]: asset })),
      modules,
      feedSources,
    }),
    [readOnly, pages, media, modules, feedSources],
  );
  const livePath = page.isHome ? "/" : `/${page.slug}`;

  return (
    <SectionEditorProvider value={editorContext}>
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col">
        {/* Top bar */}
        <div className="sticky top-14 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-background px-4 py-3">
          <Button
            variant="ghost"
            size="icon-sm"
            nativeButton={false}
            render={<Link href="/admin/content" aria-label="Back to pages" />}
          >
            <ArrowLeft aria-hidden />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{page.title}</h1>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-mono text-muted-foreground">{livePath}</span>
              <Badge
                variant="outline"
                className={isPublished ? "text-success" : "text-muted-foreground"}
              >
                {isPublished ? "Published" : "Draft"}
              </Badge>
              {isPublished && changes > 0 && (
                <Badge variant="outline" className="border-accent/40 text-accent">
                  Unpublished changes
                </Badge>
              )}
              {readOnly && <Badge variant="outline">Read only</Badge>}
            </div>
          </div>
          {!readOnly && (
            <span
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
              role="status"
              data-testid="save-status"
            >
              {status === "saving" && (
                <>
                  <Loader2 aria-hidden className="size-3.5 animate-spin" /> Saving…
                </>
              )}
              {status === "saved" && (
                <>
                  <CircleCheck aria-hidden className="size-3.5 text-success" /> Saved
                </>
              )}
              {status === "dirty" && "Unsaved changes"}
              {status === "invalid" && (
                <span className="text-destructive">
                  <CircleAlert aria-hidden className="mr-1 inline size-3.5" />
                  Fix errors to save
                </span>
              )}
              {status === "error" && (
                <span className="flex items-center gap-1.5 text-destructive">
                  <CircleAlert aria-hidden className="size-3.5" /> Couldn&apos;t save
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() =>
                      sections.filter((s) => s.status === "error").forEach((s) => void save(s.id))
                    }
                  >
                    Retry
                  </Button>
                </span>
              )}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}>
              <Settings2 aria-hidden /> Page settings
            </Button>
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen(true)}>
              <History aria-hidden /> History
            </Button>
            {isPublished && (
              <Button
                variant="outline"
                size="sm"
                nativeButton={false}
                render={<a href={livePath} target="_blank" rel="noreferrer" />}
              >
                <ExternalLink aria-hidden /> View live
              </Button>
            )}
            {canEdit && isPublished && changes > 0 && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setConfirm({ kind: "discard" })}
              >
                <Undo2 aria-hidden /> Discard changes
              </Button>
            )}
            {canPublish && isPublished && !page.isHome && (
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => setConfirm({ kind: "unpublish" })}
              >
                Unpublish
              </Button>
            )}
            {canPublish && (
              <Button
                size="sm"
                disabled={busy || unsaved || !hasChanges}
                onClick={() => setConfirm({ kind: "publish" })}
                title={unsaved ? "Wait for changes to save" : undefined}
              >
                Publish
              </Button>
            )}
          </div>
        </div>

        {/* Tablet/mobile tabs */}
        <div className="flex border-b lg:hidden" role="tablist" aria-label="Editor panels">
          {(["sections", "edit", "preview"] as const).map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={panel === name}
              onClick={() => setPanel(name)}
              className={cn(
                "flex-1 py-2.5 text-sm font-medium capitalize",
                panel === name
                  ? "border-b-2 border-accent text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[280px_minmax(0,1fr)_380px]">
          <aside
            className={cn(
              "overflow-y-auto border-r p-4 lg:block lg:max-h-[calc(100dvh-7.5rem)]",
              panel === "sections" ? "block" : "hidden",
            )}
            aria-label="Sections"
          >
            <SectionList
              sections={sections}
              selectedId={selectedId}
              readOnly={readOnly}
              onSelect={select}
              onReorder={reorder}
              onDuplicate={duplicate}
              onToggleHidden={(id) => {
                const section = sections.find((s) => s.id === id);
                if (section) edit(id, { isHidden: !section.isHidden });
              }}
              onDelete={(id) => setConfirm({ kind: "delete", sectionId: id })}
              onAdd={() => setAddOpen(true)}
            />
          </aside>
          <section
            className={cn(
              "min-h-[70dvh] p-4 lg:block lg:h-[calc(100dvh-7.5rem)]",
              panel === "preview" ? "block" : "hidden",
            )}
            aria-label="Preview"
          >
            <PreviewFrame pageId={page.id} frameRef={frameRef} onSelect={onPreviewSelect} />
          </section>
          <aside
            className={cn(
              "overflow-y-auto border-l p-4 lg:block lg:max-h-[calc(100dvh-7.5rem)]",
              panel === "edit" ? "block" : "hidden",
            )}
            aria-label="Edit section"
          >
            {selected ? (
              <>
                <SectionPanel
                  key={selected.id}
                  section={selected}
                  readOnly={readOnly}
                  onPropsChange={(props) => edit(selected.id, { props })}
                  onSettingsChange={(settings: SettingsPatch) => edit(selected.id, settings)}
                />
                {selected.saveError && (
                  <p role="alert" className="mt-4 text-sm text-destructive">
                    {selected.saveError}
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a section to edit it, or click it in the preview.
              </p>
            )}
          </aside>
        </div>
      </div>

      <AddSectionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdd={add}
        afterLabel={selected ? (getSectionDefinition(selected.type)?.label ?? null) : null}
        modules={modules}
      />
      <PageSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        page={page}
        ogImage={ogImage}
        readOnly={readOnly}
      />
      <HistorySheet
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        pageId={page.id}
        revisions={revisions}
        canRestore={canEdit}
        onRestore={(revision) => {
          setHistoryOpen(false);
          setConfirm({ kind: "restore", revision });
        }}
      />

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.kind === "publish" && "Publish this page?"}
              {confirm?.kind === "unpublish" && "Unpublish this page?"}
              {confirm?.kind === "discard" && "Discard draft changes?"}
              {confirm?.kind === "delete" && "Delete this section?"}
              {confirm?.kind === "restore" && "Restore this version to the draft?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.kind === "publish" &&
                (isPublished
                  ? `${changes} ${changes === 1 ? "section has" : "sections have"} changed since the last publish. Visitors will see the new version right away.`
                  : `The page goes live at ${livePath} with ${draftSnapshot(sections).length} sections.`)}
              {confirm?.kind === "unpublish" &&
                `Visitors will get a “page not found” at ${livePath}. The draft and history are kept.`}
              {confirm?.kind === "discard" &&
                "The draft goes back to the published version. Hidden sections are removed from the draft."}
              {confirm?.kind === "delete" &&
                (() => {
                  const section = sections.find((s) => s.id === confirm.sectionId);
                  return `“${section ? sectionSummary(section) || getSectionDefinition(section.type)?.label : "This section"}” is removed from the draft. The live page changes only when you publish.`;
                })()}
              {confirm?.kind === "restore" &&
                "The current draft is replaced with this version. Nothing changes on the live site until you publish."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant={
                confirm?.kind === "delete" || confirm?.kind === "discard"
                  ? "destructive"
                  : "default"
              }
              onClick={() => confirm && afterConfirm(confirm)}
            >
              {confirm?.kind === "publish" && "Publish"}
              {confirm?.kind === "unpublish" && "Unpublish"}
              {confirm?.kind === "discard" && "Discard changes"}
              {confirm?.kind === "delete" && "Delete section"}
              {confirm?.kind === "restore" && "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SectionEditorProvider>
  );
}
