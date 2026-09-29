import { getIntegrationDetails } from "@/core/env";
import { env } from "@/core/env";

import { IntegrationCard } from "./integration-card";

const INTEGRATIONS = [
  {
    key: "stripe",
    name: "Stripe",
    purpose: "Payments for the shop (Phase 11).",
    webhook: "/api/webhooks/stripe",
    test: "Reads your Stripe balance (read-only).",
  },
  {
    key: "resend",
    name: "Resend",
    purpose: "Email sending and marketing (Phase 10).",
    webhook: "/api/webhooks/resend",
    test: "Sends a test email to your address.",
  },
  {
    key: "mux",
    name: "Mux",
    purpose: "Video hosting for the video gallery (Phase 8).",
    webhook: "/api/webhooks/mux",
    test: "Lists one video asset (read-only).",
  },
] as const;

/** Server component: status comes from env (names only, never values). */
export function IntegrationsPanel() {
  const details = getIntegrationDetails();
  return (
    <div className="space-y-4">
      <p className="max-w-2xl text-sm text-muted-foreground">
        Integration keys live in the hosting provider&apos;s environment variables (for example in
        Vercel), never in the database. After changing them, redeploy for them to take effect.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {INTEGRATIONS.map((integration) => (
          <IntegrationCard
            key={integration.key}
            integration={integration.key}
            name={integration.name}
            purpose={integration.purpose}
            testDescription={integration.test}
            configured={details[integration.key].configured}
            missing={details[integration.key].missing}
            webhookUrl={new URL(integration.webhook, env.NEXT_PUBLIC_SITE_URL).toString()}
          />
        ))}
      </div>
    </div>
  );
}
