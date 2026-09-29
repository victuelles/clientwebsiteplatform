"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FormMessage } from "@/components/shared/form-message";
import { FormTextField } from "@/components/shared/form-text-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { profileSchema, type ProfileValues } from "@/core/auth/schemas";

import { updateProfile } from "./actions";

export function AccountForm({ fullName }: { fullName: string }) {
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { fullName },
  });

  async function onSubmit(values: ProfileValues) {
    const result = await updateProfile(values);
    if (result.ok) {
      form.reset(values);
      toast.success(result.data.message);
    } else {
      form.setError("root", { message: result.error });
    }
  }

  const rootError = form.formState.errors.root?.message;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-6">
      {rootError && <FormMessage kind="error">{rootError}</FormMessage>}
      <FieldGroup>
        <FormTextField
          control={form.control}
          name="fullName"
          label="Full name"
          autoComplete="name"
        />
      </FieldGroup>
      <Button
        type="submit"
        size="lg"
        disabled={form.formState.isSubmitting || !form.formState.isDirty}
        className="h-11 px-6 text-xs font-semibold tracking-widest uppercase"
      >
        Save changes
      </Button>
    </form>
  );
}
