// Lives inside the admin segment (not at the app root) so the layout auth guard runs before any
// streaming starts; that keeps unauthenticated redirects real 307s instead of streamed redirects.
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="flex flex-col gap-4" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 max-w-md" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-5/6 max-w-lg" />
    </main>
  );
}
