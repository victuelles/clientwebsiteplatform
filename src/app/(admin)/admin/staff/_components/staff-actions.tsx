"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

import { demoteStaff, resendInvite, setStaffActive } from "../actions";
import type { StaffStatus } from "../status";

export function StaffActions({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: StaffStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    success: string,
    after?: () => void,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error ?? "Something went wrong.");
        return;
      }
      toast.success(success);
      if (after) after();
      else router.refresh();
    });
  }

  const active = status !== "inactive";

  return (
    <div className="flex flex-wrap gap-2">
      {status === "invited" && (
        <Button
          variant="outline"
          disabled={pending}
          onClick={() => run(() => resendInvite({ userId }), "Invitation sent again.")}
        >
          Resend invite
        </Button>
      )}
      <Button
        variant="outline"
        disabled={pending}
        onClick={() =>
          run(
            () => setStaffActive({ userId, active: !active }),
            active ? `${name} was deactivated.` : `${name} was reactivated.`,
          )
        }
      >
        {active ? "Deactivate" : "Reactivate"}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" disabled={pending} />}>
          Demote to user
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Demote {name} to a regular user?</AlertDialogTitle>
            <AlertDialogDescription>
              They will lose access to the admin area and{" "}
              <strong>all of their permissions will be removed</strong>. Their account stays active.
              You can make them staff again later, but you&apos;ll need to grant permissions again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() =>
                run(
                  () => demoteStaff({ userId }),
                  `${name} is now a regular user.`,
                  () => router.push("/admin/staff"),
                )
              }
            >
              Demote
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
