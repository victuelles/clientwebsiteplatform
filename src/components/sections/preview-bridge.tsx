"use client";

import { Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

// Talks to the page editor when the preview runs inside its iframe:
//   preview -> editor: { source: "cwp-preview", type: "select", id }
//   editor -> preview: { source: "cwp-editor", type: "select", id } | { type: "refresh" }

const SELECTED_CLASS = "outline-2 outline-offset-[-2px] outline-accent outline-dashed";

function highlight(id: string | null, scroll: boolean) {
  document
    .querySelectorAll("[data-section-id]")
    .forEach((el) => el.classList.remove(...SELECTED_CLASS.split(" ")));
  if (!id) return;
  const el = document.querySelector(`[data-section-id="${CSS.escape(id)}"]`);
  if (!el) return;
  el.classList.add(...SELECTED_CLASS.split(" "));
  if (scroll) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

const subscribe = () => () => {};

export function PreviewBridge({ editorHref, label }: { editorHref: string; label: string }) {
  const router = useRouter();
  const framed = useSyncExternalStore(
    subscribe,
    () => window.self !== window.top,
    () => false,
  );

  useEffect(() => {
    if (!framed) return;
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== "cwp-editor") return;
      if (event.data.type === "refresh") router.refresh();
      if (event.data.type === "select") highlight(event.data.id ?? null, true);
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target as Element;
      const section = target.closest("[data-section-id]");
      // Inside the editor, clicks select sections instead of following links or submitting.
      if (target.closest("a, button, input, textarea, select, label")) event.preventDefault();
      if (!section) return;
      const id = section.getAttribute("data-section-id");
      highlight(id, false);
      window.parent.postMessage(
        { source: "cwp-preview", type: "select", id },
        window.location.origin,
      );
    };
    window.addEventListener("message", onMessage);
    document.addEventListener("click", onClick, true);
    window.parent.postMessage({ source: "cwp-preview", type: "ready" }, window.location.origin);
    return () => {
      window.removeEventListener("message", onMessage);
      document.removeEventListener("click", onClick, true);
    };
  }, [framed, router]);

  if (framed) return null;
  return (
    <div
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-full bg-navy py-2 pr-2 pl-4 text-xs text-navy-foreground shadow-lg"
      role="status"
    >
      <Eye aria-hidden className="size-4 text-accent" />
      <span>
        Preview · <span className="font-medium">{label}</span>
      </span>
      <a
        href={editorHref}
        className="rounded-full bg-accent px-3 py-1.5 font-semibold text-accent-foreground hover:bg-accent-hover"
      >
        Back to editor
      </a>
    </div>
  );
}
