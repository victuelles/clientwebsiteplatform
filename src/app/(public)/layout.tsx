// Placeholder public layout. The real header/footer come in Phase 4 (homepage sections).
export default function PublicLayout({ children }: LayoutProps<"/">) {
  return <div className="flex min-h-full flex-1 flex-col">{children}</div>;
}
