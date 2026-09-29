import { cn } from "@/lib/utils";

// Small wireframe previews of each section type for the "Add section" dialog.

const bar = (w: string, extra = "") => (
  <span className={cn("block h-1 rounded-full bg-current opacity-40", w, extra)} />
);
const block = (extra: string) => (
  <span className={cn("block rounded-sm bg-current opacity-15", extra)} />
);

const THUMBS: Record<string, React.ReactNode> = {
  hero: (
    <div className="flex h-full">
      <div className="flex flex-1 flex-col justify-center gap-1 p-2">
        {bar("w-8")}
        <span className="block h-2 w-14 rounded-sm bg-current opacity-60" />
        <span className="block h-2 w-12 rounded-sm bg-accent" />
        {bar("w-12 mt-1")}
        <span className="mt-1 block h-2 w-7 rounded-sm bg-accent" />
      </div>
      {block("w-1/2 rounded-none")}
    </div>
  ),
  image_with_text: (
    <div className="flex h-full items-center gap-2 p-2">
      <span className="relative block h-14 w-1/2">
        <span className="absolute inset-0 translate-x-1 translate-y-1 border border-current opacity-30" />
        {block("absolute inset-0")}
      </span>
      <div className="flex flex-1 flex-col gap-1">
        {bar("w-6")}
        {bar("w-14 h-1.5 opacity-60")}
        {bar("w-12")}
        {bar("w-10")}
      </div>
    </div>
  ),
  value_strip: (
    <div className="flex h-full items-center gap-1 bg-navy px-2 text-navy-foreground">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-1 flex-col gap-1">
          <span className="block size-1.5 rounded-full bg-accent" />
          {bar("w-full")}
        </div>
      ))}
    </div>
  ),
  card_grid: (
    <div className="flex h-full flex-col items-center gap-1 p-2">
      {bar("w-10 h-1.5 opacity-60")}
      <div className="mt-1 grid w-full grid-cols-3 gap-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={i} className="block h-4 border border-current opacity-30" />
        ))}
      </div>
    </div>
  ),
  stats: (
    <div className="flex h-full items-center gap-2 bg-navy p-2 text-navy-foreground">
      <div className="flex flex-1 flex-col gap-1">
        {bar("w-6")}
        {bar("w-12 h-1.5 opacity-80")}
        {bar("w-10")}
      </div>
      <div className="grid flex-1 grid-cols-2 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="block text-[8px] leading-none font-bold">
            25+
          </span>
        ))}
      </div>
    </div>
  ),
  testimonial: (
    <div className="flex h-full items-center gap-2 p-2">
      {block("h-14 w-1/2")}
      <div className="flex flex-1 flex-col gap-1">
        <span className="text-[10px] leading-none font-black text-accent">&rdquo;</span>
        {bar("w-full")}
        {bar("w-10")}
      </div>
    </div>
  ),
  cta_banner: (
    <div className="flex h-full items-center justify-between bg-accent px-2 text-accent-foreground">
      <div className="flex flex-col gap-1">
        {bar("w-6 opacity-70")}
        {bar("w-14 h-1.5 opacity-90")}
      </div>
      <span className="block h-2.5 w-7 rounded-sm bg-background" />
    </div>
  ),
  intro_image: (
    <div className="flex h-full flex-col items-center gap-1 p-2">
      {bar("w-8")}
      {bar("w-14 h-1.5 opacity-60")}
      {block("mt-1 h-7 w-full")}
    </div>
  ),
  module_feed: (
    <div className="flex h-full flex-col gap-1 p-2">
      {bar("w-12 h-1.5 opacity-60")}
      <div className="mt-1 grid flex-1 grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="flex flex-col border border-current/30">
            {block("h-4 rounded-none")}
          </span>
        ))}
      </div>
    </div>
  ),
  rich_text: (
    <div className="flex h-full flex-col gap-1 p-2">
      {bar("w-12 h-1.5 opacity-60")}
      {bar("w-full mt-1")}
      {bar("w-full")}
      {bar("w-3/4")}
      {bar("w-full mt-1")}
      {bar("w-1/2")}
    </div>
  ),
  contact_form: (
    <div className="flex h-full gap-1 p-2">
      <div className="flex flex-[1.6] flex-col gap-1 border border-current/30 p-1">
        {bar("w-10 h-1.5 opacity-60")}
        <div className="grid grid-cols-2 gap-1">
          {[0, 1].map((i) => (
            <span key={i} className="block h-2 border border-current/30" />
          ))}
        </div>
        <span className="block h-4 border border-current/30" />
        <span className="block h-2 w-6 bg-accent" />
      </div>
      <span className="block flex-1 bg-navy" />
    </div>
  ),
};

export function SectionThumbnail({ type }: { type: string }) {
  return (
    <div
      aria-hidden
      className="h-[72px] w-full overflow-hidden rounded-md border bg-background text-foreground"
    >
      {THUMBS[type] ?? <div className="h-full bg-muted" />}
    </div>
  );
}
