"use client";

import { Monitor, RotateCw, Smartphone } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WIDTHS = { desktop: 1440, mobile: 390 } as const;

/** The live preview: /preview/[pageId] in an iframe, scaled to fit, with a device toggle. */
export function PreviewFrame({
  pageId,
  frameRef,
  onSelect,
}: {
  pageId: string;
  frameRef: React.RefObject<HTMLIFrameElement | null>;
  onSelect: (id: string) => void;
}) {
  const [device, setDevice] = useState<keyof typeof WIDTHS>("desktop");
  const [available, setAvailable] = useState(800);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setAvailable(entry!.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.source !== "cwp-preview") return;
      if (event.data.type === "select" && typeof event.data.id === "string")
        onSelect(event.data.id);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onSelect]);

  const width = WIDTHS[device];
  const scale = Math.min(1, available / width);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-md border" role="group" aria-label="Preview width">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={device === "desktop"}
            className={cn("rounded-none", device === "desktop" && "bg-muted")}
            onClick={() => setDevice("desktop")}
          >
            <Monitor aria-hidden /> Desktop
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-pressed={device === "mobile"}
            className={cn("rounded-none", device === "mobile" && "bg-muted")}
            onClick={() => setDevice("mobile")}
          >
            <Smartphone aria-hidden /> Mobile
          </Button>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => frameRef.current?.contentWindow?.location.reload()}
          aria-label="Reload preview"
        >
          <RotateCw aria-hidden />
        </Button>
      </div>
      <div
        ref={container}
        className="relative min-h-0 flex-1 overflow-hidden rounded-lg border bg-muted"
      >
        <div
          className="absolute top-0 left-1/2 origin-top"
          style={{
            width,
            height: `${100 / scale}%`,
            transform: `translateX(-50%) scale(${scale})`,
          }}
        >
          <iframe
            ref={frameRef}
            src={`/preview/${pageId}`}
            title="Page preview"
            className="h-full w-full bg-background"
            data-testid="preview-frame"
          />
        </div>
      </div>
    </div>
  );
}
