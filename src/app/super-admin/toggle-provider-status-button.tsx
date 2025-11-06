
"use client"

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { TrainingProvider } from "@prisma/client";
import { toggleProviderStatus } from "@/app/actions/super-admin-actions";

type ToggleProviderStatusButtonProps = {
  provider: TrainingProvider;
};

export function ToggleProviderStatusButton({ provider }: ToggleProviderStatusButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleConfirmToggle = async () => {
    const result = await toggleProviderStatus(provider.id, !provider.isActive);
    if (result.success) {
      toast({
        title: `Provider ${provider.isActive ? "Deactivated" : "Activated"}`,
        description: result.message,
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
    setOpen(false);
  };
  
  const isActivating = !provider.isActive;

  return (
    <>
      <Button
        variant={provider.isActive ? "destructive-outline" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {provider.isActive ? "Deactivate" : "Activate"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {isActivating
                ? `This will reactivate the provider "${provider.name}", allowing their users and admins to access the system again.`
                : `This will deactivate the provider "${provider.name}". Their admins and users will no longer be able to log in.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
            >
              {isActivating ? "Confirm Activation" : "Confirm Deactivation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
