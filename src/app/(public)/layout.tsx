import { SiteHeader } from "./_components/site-header";

// Placeholder public layout. The real header/footer come in Phase 3/4.
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
