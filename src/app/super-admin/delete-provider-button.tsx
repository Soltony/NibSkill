
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
import { toggleProviderStatus } from "@/app/actions/super-admin-actions";
import type { TrainingProvider } from "@prisma/client";
import { cn } from "@/lib/utils";

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
        title: "Provider Status Updated",
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

  const isDeactivating = provider.isActive;

  return (
    <>
      <Button
        variant={isDeactivating ? "destructive-outline" : "secondary"}
        size="sm"
        onClick={() => setOpen(true)}
      >
        {isDeactivating ? "Deactivate" : "Activate"}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will {isDeactivating ? "deactivate" : "activate"} the provider{" "}
              <span className="font-semibold">"{provider.name}"</span>. 
              {isDeactivating 
                ? " Their admins and users will not be able to log in."
                : " Their admins and users will regain access to the system."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggle}
              className={cn(!isDeactivating && "bg-green-600 hover:bg-green-700")}
            >
              Confirm {isDeactivating ? "Deactivation" : "Activation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
