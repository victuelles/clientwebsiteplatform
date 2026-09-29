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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CircleAlert,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SiteIcon } from "@/core/icons/icon";
import { getSectionDefinition } from "@/core/sections/registry";
import { cn } from "@/lib/utils";

import type { SectionState } from "./types";

export function sectionSummary(section: SectionState): string {
  const props = section.props;
  for (const key of ["heading", "headline", "eyebrow"]) {
    const value = props[key];
    if (typeof value === "string" && value.trim()) return value.replace(/\s+/g, " ").trim();
  }
  if (Array.isArray(props.items) && props.items.length) return `${props.items.length} items`;
  return "";
}

function Item({
  section,
  index,
  count,
  selected,
  readOnly,
  onSelect,
  onMove,
  onDuplicate,
  onToggleHidden,
  onDelete,
}: {
  section: SectionState;
  index: number;
  count: number;
  selected: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onMove: (to: number) => void;
  onDuplicate: () => void;
  onToggleHidden: () => void;
  onDelete: () => void;
}) {
  const definition = getSectionDefinition(section.type);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
    disabled: readOnly,
  });
  const label = definition?.label ?? section.type;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      data-testid="section-item"
      data-section-type={section.type}
      className={cn(
        "group flex items-center gap-1 rounded-lg border bg-background p-1.5",
        selected && "border-accent ring-1 ring-accent",
        isDragging && "relative z-10 shadow-lg",
        section.isHidden && "opacity-60",
      )}
    >
      {!readOnly && (
        <button
          type="button"
          className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted"
          aria-label={`Reorder ${label} section (position ${index + 1} of ${count}). Press space, then arrow keys.`}
          {...attributes}
          {...listeners}
        >
          <GripVertical aria-hidden className="size-4" />
        </button>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className="flex min-w-0 flex-1 items-center gap-2 px-1 py-1 text-left"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded bg-muted text-accent">
          <SiteIcon name={definition?.icon} className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{label}</span>
          <span className="block truncate text-xs text-muted-foreground">
            {sectionSummary(section) || " "}
          </span>
        </span>
        {section.isHidden && (
          <Badge variant="outline" className="shrink-0 text-[10px]">
            Hidden
          </Badge>
        )}
        {section.status === "saving" && (
          <Loader2
            aria-label="Saving"
            className="size-3.5 shrink-0 animate-spin text-muted-foreground"
          />
        )}
        {(section.status === "error" || section.status === "invalid") && (
          <CircleAlert
            aria-label="Needs attention"
            className="size-3.5 shrink-0 text-destructive"
          />
        )}
      </button>
      {!readOnly && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${label} section ${index + 1}`}
              />
            }
          >
            <MoreHorizontal aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-44">
            <DropdownMenuItem disabled={index === 0} onClick={() => onMove(index - 1)}>
              <ArrowUp aria-hidden /> Move up
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === count - 1} onClick={() => onMove(index + 1)}>
              <ArrowDown aria-hidden /> Move down
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy aria-hidden /> Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleHidden}>
              {section.isHidden ? <Eye aria-hidden /> : <EyeOff aria-hidden />}{" "}
              {section.isHidden ? "Show" : "Hide"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2 aria-hidden /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </li>
  );
}

export function SectionList({
  sections,
  selectedId,
  readOnly,
  onSelect,
  onReorder,
  onDuplicate,
  onToggleHidden,
  onDelete,
  onAdd,
}: {
  sections: SectionState[];
  selectedId: string | null;
  readOnly: boolean;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
  onDuplicate: (id: string) => void;
  onToggleHidden: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const ids = sections.map((s) => s.id);

  function move(from: number, to: number) {
    if (to < 0 || to >= ids.length || from === to) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onReorder(next);
  }

  function onDragEnd(event: DragEndEvent) {
    if (!event.over) return;
    move(ids.indexOf(String(event.active.id)), ids.indexOf(String(event.over.id)));
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Sections</h2>
        <span className="text-xs text-muted-foreground">{sections.length}</span>
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ol className="space-y-2" aria-label="Page sections">
            {sections.map((section, index) => (
              <Item
                key={section.id}
                section={section}
                index={index}
                count={sections.length}
                selected={section.id === selectedId}
                readOnly={readOnly}
                onSelect={() => onSelect(section.id)}
                onMove={(to) => move(index, to)}
                onDuplicate={() => onDuplicate(section.id)}
                onToggleHidden={() => onToggleHidden(section.id)}
                onDelete={() => onDelete(section.id)}
              />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {sections.length === 0 && <p className="text-sm text-muted-foreground">No sections yet.</p>}
      {!readOnly && (
        <Button type="button" variant="outline" onClick={onAdd} className="w-full">
          <Plus aria-hidden />
          Add section
        </Button>
      )}
    </div>
  );
}
