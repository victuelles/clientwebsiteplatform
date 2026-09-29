import "server-only";

import { Resend } from "resend";

import { env } from "@/core/env";

export type IntegrationKey = "stripe" | "resend" | "mux";
export type TestResult = { ok: true; message: string } | { ok: false; message: string };

async function providerError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { message?: string; messages?: string[] } | string;
    };
    if (typeof body.error === "string") return body.error;
    return body.error?.message ?? body.error?.messages?.join(" ") ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/** Stripe: read the account balance (read-only). */
async function testStripe(): Promise<TestResult> {
  const response = await fetch("https://api.stripe.com/v1/balance", {
    headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { ok: false, message: `Stripe: ${await providerError(response)}` };
  const livemode = ((await response.json()) as { livemode?: boolean }).livemode;
  return { ok: true, message: `Connected to Stripe (${livemode ? "live" : "test"} mode).` };
}

/** Mux: list at most one asset (read-only). */
async function testMux(): Promise<TestResult> {
  const credentials = Buffer.from(`${env.MUX_TOKEN_ID}:${env.MUX_TOKEN_SECRET}`).toString("base64");
  const response = await fetch("https://api.mux.com/video/v1/assets?limit=1", {
    headers: { Authorization: `Basic ${credentials}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return { ok: false, message: `Mux: ${await providerError(response)}` };
  return { ok: true, message: "Connected to Mux." };
}

/** Resend: send a real test email to `to`. */
async function testResend(to: string): Promise<TestResult> {
  const resend = new Resend(env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: env.RESEND_FROM_EMAIL!,
    to,
    subject: "Test email from your website",
    text: "This is a test email sent from Settings → Integrations. Your email sending is working.",
  });
  if (error) return { ok: false, message: `Resend: ${error.message}` };
  return { ok: true, message: `Test email sent to ${to}.` };
}

export async function testIntegration(
  key: IntegrationKey,
  superAdminEmail: string,
): Promise<TestResult> {
  try {
    if (key === "stripe") return await testStripe();
    if (key === "mux") return await testMux();
    return await testResend(superAdminEmail);
  } catch (error) {
    const message =
      error instanceof Error && error.name === "TimeoutError" ? "timed out" : "could not connect";
    return { ok: false, message: `${key[0]!.toUpperCase()}${key.slice(1)}: ${message}.` };
  }
}
