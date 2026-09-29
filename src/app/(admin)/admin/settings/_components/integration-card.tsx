"use client";

import { Check, Copy, PlugZap } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { testIntegrationConnection } from "../integrations-actions";

export function IntegrationCard({
  integration,
  name,
  purpose,
  testDescription,
  configured,
  missing,
  webhookUrl,
}: {
  integration: "stripe" | "resend" | "mux";
  name: string;
  purpose: string;
  testDescription: string;
  configured: boolean;
  missing: string[];
  webhookUrl: string;
}) {
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function test() {
    startTransition(async () => {
      const response = await testIntegrationConnection({ integration });
      setResult(response.ok ? response.data : { ok: false, message: response.error });
    });
  }

  return (
    <Card className="ring-border" data-testid={`integration-${integration}`}>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{name}</CardTitle>
          <Badge
            variant="outline"
            className={configured ? "text-success" : "text-muted-foreground"}
          >
            {configured ? "Configured" : "Not configured"}
          </Badge>
        </div>
        <CardDescription>{purpose}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {!configured && (
          <div>
            <p className="mb-1 text-muted-foreground">Missing environment variables:</p>
            <ul className="space-y-1">
              {missing.map((variable) => (
                <li key={variable}>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{variable}</code>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="space-y-1.5">
          <label htmlFor={`${integration}-webhook`} className="text-muted-foreground">
            Webhook URL (needed in a later phase)
          </label>
          <div className="flex gap-2">
            <Input
              id={`${integration}-webhook`}
              readOnly
              value={webhookUrl}
              className="h-9 font-mono text-xs"
              onFocus={(e) => e.target.select()}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              aria-label={`Copy ${name} webhook URL`}
              onClick={() =>
                void navigator.clipboard
                  .writeText(webhookUrl)
                  .then(() => toast.success("Webhook URL copied."))
              }
            >
              <Copy aria-hidden />
            </Button>
          </div>
        </div>
        {result && (
          <FormMessage kind={result.ok ? "success" : "error"}>
            <span className="flex items-start gap-2">
              {result.ok && <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />}
              {result.message}
            </span>
          </FormMessage>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-2">
        <Button type="button" variant="outline" disabled={!configured || pending} onClick={test}>
          <PlugZap aria-hidden />
          {pending ? "Testing…" : "Test connection"}
        </Button>
        <p className="text-xs text-muted-foreground">{testDescription}</p>
      </CardFooter>
    </Card>
  );
}
