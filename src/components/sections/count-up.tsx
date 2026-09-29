"use client";

import { useEffect, useRef, useState } from "react";

/** "25+" -> { prefix: "", number: 25, suffix: "+" }; non-numeric values are shown as-is. */
function parse(value: string) {
  const match = /^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/.exec(value);
  if (!match) return null;
  const digits = match[2]!.replace(/,/g, "");
  return {
    prefix: match[1]!,
    number: Number(digits),
    decimals: digits.split(".")[1]?.length ?? 0,
    grouped: match[2]!.includes(","),
    suffix: match[3]!,
  };
}

/** Counts up to the value when scrolled into view; disabled for reduced-motion users. */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const parsed = parse(value);
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const element = ref.current;
    if (!parsed || !element) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const format = (n: number) =>
      `${parsed.prefix}${parsed.grouped ? n.toLocaleString("en", { maximumFractionDigits: parsed.decimals }) : n.toFixed(parsed.decimals)}${parsed.suffix}`;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1400;
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - (1 - t) ** 3;
          setDisplay(format(parsed.number * eased));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        setDisplay(format(0));
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <span ref={ref} className={className} aria-label={value}>
      <span aria-hidden>{display}</span>
    </span>
  );
}
