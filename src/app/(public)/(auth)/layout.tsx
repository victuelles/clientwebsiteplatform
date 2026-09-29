export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 items-start justify-center bg-muted px-4 py-12 sm:items-center sm:py-20">
      {children}
    </main>
  );
}
