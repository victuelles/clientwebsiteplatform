"use client";

import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, Link2, List, ListOrdered, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { RICH_TEXT_STARTER_KIT_OPTIONS, type RichTextDoc } from "@/core/sections/rich-text";
import { cn } from "@/lib/utils";

/** Rich text limited to paragraphs, bold, italic, links, and lists (stored as Tiptap JSON). */
export function RichTextField({
  id,
  value,
  onChange,
  readOnly,
  invalid,
}: {
  id: string;
  value: RichTextDoc | null | undefined;
  onChange: (doc: RichTextDoc) => void;
  readOnly?: boolean;
  invalid?: boolean;
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure(RICH_TEXT_STARTER_KIT_OPTIONS)],
    content: (value ?? { type: "doc", content: [] }) as JSONContent,
    editable: !readOnly,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        id,
        class:
          "min-h-28 px-3 py-2 text-sm leading-relaxed outline-none [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_ol]:list-decimal [&_p+p]:mt-2 [&_ul]:list-disc",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.getJSON() as RichTextDoc),
  });

  const tool = (label: string, active: boolean, run: () => void, Icon: typeof Bold) => (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      aria-pressed={active}
      className={cn(active && "bg-muted text-foreground")}
      onClick={run}
      disabled={!editor || readOnly}
    >
      <Icon aria-hidden />
    </Button>
  );

  function editLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("Link address (https://…, /page, mailto:…)", previous ?? "https://");
    if (href === null) return;
    if (href.trim() === "") editor.chain().focus().unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-input focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        invalid && "border-destructive",
      )}
    >
      {!readOnly && (
        <div className="flex flex-wrap gap-0.5 border-b p-1" role="toolbar" aria-label="Formatting">
          {tool(
            "Bold",
            !!editor?.isActive("bold"),
            () => editor?.chain().focus().toggleBold().run(),
            Bold,
          )}
          {tool(
            "Italic",
            !!editor?.isActive("italic"),
            () => editor?.chain().focus().toggleItalic().run(),
            Italic,
          )}
          {tool(
            "Bulleted list",
            !!editor?.isActive("bulletList"),
            () => editor?.chain().focus().toggleBulletList().run(),
            List,
          )}
          {tool(
            "Numbered list",
            !!editor?.isActive("orderedList"),
            () => editor?.chain().focus().toggleOrderedList().run(),
            ListOrdered,
          )}
          {tool("Link", !!editor?.isActive("link"), editLink, Link2)}
          {editor?.isActive("link") &&
            tool("Remove link", false, () => editor.chain().focus().unsetLink().run(), Unlink)}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
