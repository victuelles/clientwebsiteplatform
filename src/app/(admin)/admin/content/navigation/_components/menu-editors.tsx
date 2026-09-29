"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, GripVertical, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { SectionEditorProvider, type EditorPage } from "@/components/section-editor/editor-context";
import { LinkField } from "@/components/section-editor/link-field";
import { useUnsavedChangesWarning } from "@/components/shared/use-unsaved-changes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { usePermissions } from "@/core/access/permissions-provider";
import type { Link } from "@/core/links/types";
import { menuSchema, type MenuItemInput, type MenuKey } from "@/core/navigation/types";

import { saveMenu } from "../actions";

export type EditableMenu = { key: MenuKey; title: string; items: MenuItemInput[] };

const MENU_LABELS: Record<MenuKey, { name: string; description: string }> = {
  header: {
    name: "Header menu",
    description: "The main links in the navy header. Items can have one level of dropdown links.",
  },
  footer_1: { name: "Footer column 1", description: "The first link column in the footer." },
  footer_2: { name: "Footer column 2", description: "The second link column in the footer." },
};

type ChildRow = { _id: number; label: string; link: Link; openInNewTab?: boolean };
type Row = ChildRow & { children: ChildRow[] };

let nextId = 1;
const withIds = (items: MenuItemInput[]): Row[] =>
  items.map((item) => ({
    ...item,
    _id: nextId++,
    children: (item.children ?? []).map((c) => ({ ...c, _id: nextId++ })),
  }));

function linkWarning(
  link: Link | null | undefined,
  pages: EditorPage[],
  modules: Record<string, boolean>,
): string | null {
  if (!link) return "Choose where this item links to.";
  if (link.kind === "page" || (link.kind === "anchor" && link.pageId)) {
    const page = pages.find((p) => p.id === link.pageId);
    if (!page) return "The linked page no longer exists; this item is hidden.";
    if (!page.published) return `“${page.title}” isn't published; this item is hidden until it is.`;
  }
  if (link.kind === "module" && !modules[link.moduleKey])
    return "This module is turned off; the item is hidden until it's on.";
  return null;
}

function ItemEditor({
  item,
  index,
  count,
  readOnly,
  pages,
  modules,
  allowChildren,
  onChange,
  onMove,
  onRemove,
  child,
}: {
  item: Row | ChildRow;
  index: number;
  count: number;
  readOnly: boolean;
  pages: EditorPage[];
  modules: Record<string, boolean>;
  allowChildren: boolean;
  onChange: (item: Row | ChildRow) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  child?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item._id,
    disabled: readOnly,
  });
  const warning = linkWarning(item.link, pages, modules);
  const label = item.label || `Item ${index + 1}`;
  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition: transition,
      }}
      className="rounded-lg border bg-background p-3"
      data-testid={child ? "menu-child" : "menu-item"}
    >
      <div className="flex items-start gap-2">
        {!readOnly && (
          <button
            type="button"
            className="mt-1.5 flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label={`Reorder ${label}. Press space, then arrow keys.`}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        )}
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Input
              aria-label={`Label for item ${index + 1}`}
              value={item.label}
              onChange={(e) => onChange({ ...item, label: e.target.value })}
              placeholder="Label"
              maxLength={80}
              className="h-9"
              disabled={readOnly}
            />
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <Switch
                checked={Boolean(item.openInNewTab)}
                onCheckedChange={(v) => onChange({ ...item, openInNewTab: v })}
                disabled={readOnly}
                aria-label={`Open ${label} in a new tab`}
              />
              Open in a new tab
            </label>
          </div>
          <LinkField
            id={`menu-link-${item._id}`}
            value={item.link ?? null}
            onChange={(link) => onChange({ ...item, link: link as Link })}
            optional={false}
          />
        </div>
        {!readOnly && (
          <div className="flex shrink-0 flex-col gap-0.5 sm:flex-row">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${label} up`}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${label} down`}
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${label}`}
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
            </Button>
          </div>
        )}
      </div>
      {warning && (
        <p
          className="mt-2 flex items-center gap-1.5 text-xs text-accent"
          data-testid="menu-warning"
        >
          <TriangleAlert aria-hidden className="size-3.5 shrink-0" /> {warning}
        </p>
      )}
      {allowChildren && "children" in item && (
        <ChildList
          parent={item as Row}
          readOnly={readOnly}
          pages={pages}
          modules={modules}
          onChange={(children) => onChange({ ...(item as Row), children })}
        />
      )}
    </li>
  );
}

function useListSensors() {
  return useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function ChildList({
  parent,
  readOnly,
  pages,
  modules,
  onChange,
}: {
  parent: Row;
  readOnly: boolean;
  pages: EditorPage[];
  modules: Record<string, boolean>;
  onChange: (children: ChildRow[]) => void;
}) {
  const sensors = useListSensors();
  const children = parent.children;
  const move = (from: number, to: number) =>
    to >= 0 && to < children.length && onChange(arrayMove(children, from, to));
  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    move(
      children.findIndex((c) => c._id === event.active.id),
      children.findIndex((c) => c._id === event.over!.id),
    );
  };
  return (
    <div className="mt-3 border-l-2 pl-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">Dropdown items</p>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={children.map((c) => c._id)} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2">
            {children.map((c, index) => (
              <ItemEditor
                key={c._id}
                child
                item={c}
                index={index}
                count={children.length}
                readOnly={readOnly}
                pages={pages}
                modules={modules}
                allowChildren={false}
                onChange={(next) =>
                  onChange(children.map((x) => (x._id === c._id ? (next as ChildRow) : x)))
                }
                onMove={(to) => move(index, to)}
                onRemove={() => onChange(children.filter((x) => x._id !== c._id))}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!readOnly && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2"
          onClick={() =>
            onChange([
              ...children,
              { _id: nextId++, label: "", link: { kind: "url", href: "/" }, openInNewTab: false },
            ])
          }
        >
          <Plus aria-hidden /> Add dropdown item
        </Button>
      )}
    </div>
  );
}

function MenuEditor({
  menu,
  pages,
  modules,
  readOnly,
  onDirty,
}: {
  menu: EditableMenu;
  pages: EditorPage[];
  modules: Record<string, boolean>;
  readOnly: boolean;
  onDirty: (key: MenuKey, dirty: boolean) => void;
}) {
  const [title, setTitle] = useState(menu.title);
  const [items, setItems] = useState<Row[]>(() => withIds(menu.items));
  const [saved, setSaved] = useState(() =>
    JSON.stringify({ title: menu.title, items: menu.items }),
  );
  const [pending, startTransition] = useTransition();
  const sensors = useListSensors();
  const plain = (rows: Row[]): MenuItemInput[] =>
    rows.map(({ _id: _a, children, ...rest }) => ({
      ...rest,
      children: children.map(({ _id: _b, ...c }) => c),
    }));
  const current = JSON.stringify({ title, items: plain(items) });
  const dirty = current !== saved;
  useEffect(() => onDirty(menu.key, dirty), [dirty, menu.key, onDirty]);

  const move = (from: number, to: number) =>
    to >= 0 && to < items.length && setItems(arrayMove(items, from, to));
  const onDragEnd = (event: DragEndEvent) => {
    if (!event.over) return;
    move(
      items.findIndex((i) => i._id === event.active.id),
      items.findIndex((i) => i._id === event.over!.id),
    );
  };

  function save() {
    const payload = { key: menu.key, title, items: plain(items) };
    const parsed = menuSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the menu items.");
      return;
    }
    startTransition(async () => {
      const result = await saveMenu(payload);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved(current);
      toast.success(`${MENU_LABELS[menu.key].name} saved.`);
    });
  }

  const info = MENU_LABELS[menu.key];
  return (
    <Card className="ring-border" data-testid={`menu-${menu.key}`}>
      <CardHeader>
        <CardTitle>{info.name}</CardTitle>
        <CardDescription>{info.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {menu.key !== "header" && (
          <div className="max-w-sm space-y-1.5">
            <label htmlFor={`title-${menu.key}`} className="text-sm font-medium">
              Column heading
            </label>
            <Input
              id={`title-${menu.key}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={60}
              className="h-9"
              disabled={readOnly}
            />
          </div>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i._id)} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2" aria-label={`${info.name} items`}>
              {items.map((item, index) => (
                <ItemEditor
                  key={item._id}
                  item={item}
                  index={index}
                  count={items.length}
                  readOnly={readOnly}
                  pages={pages}
                  modules={modules}
                  allowChildren={menu.key === "header"}
                  onChange={(next) =>
                    setItems(items.map((i) => (i._id === item._id ? (next as Row) : i)))
                  }
                  onMove={(to) => move(index, to)}
                  onRemove={() => setItems(items.filter((i) => i._id !== item._id))}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        {items.length === 0 && <p className="text-sm text-muted-foreground">No items yet.</p>}
        {!readOnly && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setItems([
                  ...items,
                  {
                    _id: nextId++,
                    label: "",
                    link: { kind: "url", href: "/" },
                    openInNewTab: false,
                    children: [],
                  },
                ])
              }
            >
              <Plus aria-hidden /> Add item
            </Button>
            <div className="flex items-center gap-3">
              {dirty && (
                <span className="text-sm text-accent" role="status">
                  Unsaved changes
                </span>
              )}
              <Button type="button" disabled={!dirty || pending} onClick={save}>
                Save {info.name.toLowerCase()}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MenuEditors({
  menus,
  pages,
  modules,
}: {
  menus: EditableMenu[];
  pages: EditorPage[];
  modules: Record<string, boolean>;
}) {
  const { can } = usePermissions();
  const readOnly = !can("content", "edit");
  const [dirty, setDirty] = useState<Partial<Record<MenuKey, boolean>>>({});
  const onDirty = useMemo(
    () => (key: MenuKey, value: boolean) =>
      setDirty((d) => (d[key] === value ? d : { ...d, [key]: value })),
    [],
  );
  useUnsavedChangesWarning(Object.values(dirty).some(Boolean));

  return (
    <SectionEditorProvider
      value={{ readOnly, pages, media: {}, registerMedia: () => {}, modules, feedSources: [] }}
    >
      <div className="space-y-6">
        {menus.map((menu) => (
          <MenuEditor
            key={menu.key}
            menu={menu}
            pages={pages}
            modules={modules}
            readOnly={readOnly}
            onDirty={onDirty}
          />
        ))}
      </div>
    </SectionEditorProvider>
  );
}
