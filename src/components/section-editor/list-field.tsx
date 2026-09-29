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
import { ArrowDown, ArrowUp, ChevronDown, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import type { FieldDef } from "@/core/sections/fields";
import { cn } from "@/lib/utils";

import { childErrors, useSectionEditor, type FieldErrors } from "./editor-context";
import { FieldGroupInputs } from "./field-input";

type ListFieldDef = Extract<FieldDef, { type: "list" }>;

// Stable ids for dnd-kit (items themselves have no ids). Kept in state; resynced when the list
// length changes from outside (e.g. discard or restore).
function useItemIds(length: number) {
  const [state, setState] = useState(() => ({
    ids: Array.from({ length }, (_, i) => i),
    next: length,
    initial: length,
  }));
  let { ids } = state;
  if (ids.length !== length) {
    const fixed = ids.slice(0, length);
    let next = state.next;
    while (fixed.length < length) fixed.push(next++);
    setState({ ...state, ids: fixed, next });
    ids = fixed;
  }
  return {
    ids,
    /** Items added in this session (ids past the initial ones) start expanded. */
    isNew: (id: number) => id >= state.initial,
    setIds: (nextIds: number[]) => setState((s) => ({ ...s, ids: nextIds })),
    /** Appends a fresh id (call together with appending the item). */
    add: () => setState((s) => ({ ...s, ids: [...s.ids, s.next], next: s.next + 1 })),
  };
}

function SortableItem({
  id,
  index,
  count,
  title,
  field,
  item,
  errors,
  readOnly,
  onChange,
  onMove,
  onRemove,
  canRemove,
  defaultOpen,
  idPrefix,
}: {
  id: number;
  index: number;
  count: number;
  title: string;
  field: ListFieldDef;
  item: Record<string, unknown>;
  errors: FieldErrors;
  readOnly: boolean;
  onChange: (item: Record<string, unknown>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
  canRemove: boolean;
  defaultOpen: boolean;
  idPrefix: string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: readOnly,
  });
  const [open, setOpen] = useState(defaultOpen);
  const hasError = Object.keys(errors).length > 0;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "rounded-lg border bg-background",
        isDragging && "relative z-10 shadow-lg",
        hasError && "border-destructive",
      )}
    >
      <div className="flex items-center gap-1 p-1.5">
        {!readOnly && (
          <button
            type="button"
            className="flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label={`Drag ${field.itemLabel} ${index + 1}. Use space and arrow keys to move.`}
            {...attributes}
            {...listeners}
          >
            <GripVertical aria-hidden className="size-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 px-1 text-left text-sm"
        >
          <ChevronDown
            aria-hidden
            className={cn("size-4 shrink-0 transition-transform", !open && "-rotate-90")}
          />
          <span className="truncate font-medium">{title || `${field.itemLabel} ${index + 1}`}</span>
          {hasError && <span className="text-xs text-destructive">Needs attention</span>}
        </button>
        {!readOnly && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${field.itemLabel} ${index + 1} up`}
              disabled={index === 0}
              onClick={() => onMove(index - 1)}
            >
              <ArrowUp aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Move ${field.itemLabel} ${index + 1} down`}
              disabled={index === count - 1}
              onClick={() => onMove(index + 1)}
            >
              <ArrowDown aria-hidden />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Remove ${field.itemLabel} ${index + 1}`}
              disabled={!canRemove}
              onClick={onRemove}
            >
              <Trash2 aria-hidden />
            </Button>
          </>
        )}
      </div>
      {open && (
        <div className="border-t p-3">
          <FieldGroupInputs
            fields={field.fields}
            value={item}
            onChange={onChange}
            errors={errors}
            idPrefix={`${idPrefix}-${index}-`}
          />
        </div>
      )}
    </li>
  );
}

/** A repeatable list with add, remove, move, and drag reorder (pointer and keyboard). */
export function ListField({
  field,
  value,
  onChange,
  errors,
  idPrefix,
}: {
  field: ListFieldDef;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  errors: FieldErrors;
  idPrefix: string;
}) {
  const { readOnly } = useSectionEditor();
  const items = value as Record<string, unknown>[];
  const { ids, isNew, setIds, add } = useItemIds(items.length);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const max = field.max ?? 50;
  const min = field.min ?? 0;

  function move(from: number, to: number) {
    if (to < 0 || to >= items.length) return;
    setIds(arrayMove(ids, from, to));
    onChange(arrayMove(items, from, to));
  }

  function onDragEnd(event: DragEndEvent) {
    const from = ids.indexOf(Number(event.active.id));
    const to = event.over ? ids.indexOf(Number(event.over.id)) : -1;
    if (from >= 0 && to >= 0 && from !== to) move(from, to);
  }

  const listError = errors[""];

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">
        {field.label}{" "}
        <span className="font-normal text-muted-foreground">
          ({items.length}
          {field.max ? ` of up to ${field.max}` : ""})
        </span>
      </legend>
      {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          <ul className="space-y-2">
            {items.map((item, index) => (
              <SortableItem
                key={ids[index]}
                id={ids[index]!}
                index={index}
                count={items.length}
                title={field.itemTitleField ? String(item[field.itemTitleField] ?? "") : ""}
                field={field}
                item={item}
                errors={childErrors(errors, String(index))}
                readOnly={readOnly}
                onChange={(next) => onChange(items.map((it, i) => (i === index ? next : it)))}
                onMove={(to) => move(index, to)}
                onRemove={() => {
                  setIds(ids.filter((_, i) => i !== index));
                  onChange(items.filter((_, i) => i !== index));
                }}
                canRemove={items.length > min}
                defaultOpen={isNew(ids[index]!)}
                idPrefix={idPrefix}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      {listError && <p className="text-xs text-destructive">{listError}</p>}
      {!readOnly && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= max}
          onClick={() => {
            add();
            onChange([...items, structuredClone(field.newItem)]);
          }}
        >
          <Plus aria-hidden />
          Add {field.itemLabel.toLowerCase()}
        </Button>
      )}
    </fieldset>
  );
}
