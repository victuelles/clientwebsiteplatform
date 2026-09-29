// Placeholder admin layout. The real admin shell (navigation, access guard) comes in Phase 2.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b px-6 py-4">
        <span className="font-semibold">Admin</span>
      </header>
      <div className="flex-1 p-6">{children}</div>
    </div>
  );
}
