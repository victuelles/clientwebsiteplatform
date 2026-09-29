"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";

import { inviteStaff, promoteToStaff } from "../actions";
import { inviteStaffSchema, type InviteStaffValues } from "../schemas";

export function InviteStaffDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [existing, setExisting] = useState<{ userId: string; name: string } | null>(null);
  const [promoting, startPromote] = useTransition();
  const form = useForm<InviteStaffValues>({
    resolver: zodResolver(inviteStaffSchema),
    defaultValues: { fullName: "", email: "" },
  });

  function reset() {
    form.reset();
    setExisting(null);
  }

  async function onSubmit(values: InviteStaffValues) {
    const result = await inviteStaff(values);
    if (!result.ok) {
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        form.setError(field as keyof InviteStaffValues, { message: messages[0] });
      }
      form.setError("root", { message: result.error });
      return;
    }
    if (result.data.kind === "existing_user") {
      setExisting({ userId: result.data.userId, name: result.data.name });
      return;
    }
    toast.success(`Invitation sent to ${values.email}.`);
    setOpen(false);
    reset();
    router.push(`/admin/staff/${result.data.userId}`);
  }

  function promote() {
    if (!existing) return;
    startPromote(async () => {
      const result = await promoteToStaff({ userId: existing.userId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${existing.name} is now a staff member.`);
      setOpen(false);
      reset();
      router.push(`/admin/staff/${existing.userId}`);
    });
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger render={<Button size="lg" className="h-10 px-4" />}>
        <UserPlus aria-hidden />
        Invite staff
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {existing ? (
          <>
            <DialogHeader>
              <DialogTitle>Promote an existing user?</DialogTitle>
              <DialogDescription>
                <strong className="text-foreground">{existing.name}</strong> already has an account
                on this site. You can make them a staff member instead of sending an invitation.
                They start with no permissions.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setExisting(null)} disabled={promoting}>
                Back
              </Button>
              <Button onClick={promote} disabled={promoting}>
                Promote to staff
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
            <DialogHeader>
              <DialogTitle>Invite a staff member</DialogTitle>
              <DialogDescription>
                They&apos;ll get an email with a link to set a password. You can choose their
                permissions next.
              </DialogDescription>
            </DialogHeader>
            {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
            <FieldGroup>
              <FormTextField
                control={form.control}
                name="fullName"
                label="Name"
                autoComplete="off"
              />
              <FormTextField
                control={form.control}
                name="email"
                label="Email"
                type="email"
                autoComplete="off"
              />
            </FieldGroup>
            <DialogFooter>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                Send invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
