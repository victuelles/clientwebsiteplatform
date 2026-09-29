import { Button } from "@/components/ui/button";
import { siteConfig } from "@/core/site";

// Placeholder that proves the theme tokens work. The real homepage is built in Phase 4.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-24 text-center">
      <p className="flex items-center gap-3 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase">
        <span aria-hidden className="h-px w-6 bg-accent" />
        Phase 0 placeholder
      </p>
      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">{siteConfig.name}</h1>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" className="h-11 px-6 text-xs font-semibold tracking-widest uppercase">
          Accent button
        </Button>
        <Button
          size="lg"
          variant="dark"
          className="h-11 px-6 text-xs font-semibold tracking-widest uppercase"
        >
          Dark button
        </Button>
      </div>
    </main>
  );
}
