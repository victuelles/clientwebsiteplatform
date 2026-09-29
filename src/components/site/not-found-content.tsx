import { ActionLink } from "@/components/shared/action-link";
import { Eyebrow } from "@/components/shared/eyebrow";
import { SiteContainer } from "@/components/site/container";

/** The 404 message, shared by the public and root not-found pages. */
export function NotFoundContent() {
  return (
    <main className="flex flex-1 items-center bg-muted py-24">
      <SiteContainer className="flex flex-col items-center gap-5 text-center">
        <Eyebrow>404</Eyebrow>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Page not found</h1>
        <p className="max-w-md text-muted-foreground">
          The page you are looking for doesn&apos;t exist or has moved.
        </p>
        <ActionLink href="/" variant="accent" arrow="right">
          Back to home
        </ActionLink>
      </SiteContainer>
    </main>
  );
}
