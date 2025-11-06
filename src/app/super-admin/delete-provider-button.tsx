

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
import { deleteTrainingProvider } from "@/app/actions/super-admin-actions";

type DeleteProviderButtonProps = {
  provider: TrainingProvider;
};

export function DeleteProviderButton({ provider }: DeleteProviderButtonProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const handleConfirmDelete = async () => {
    const result = await deleteTrainingProvider(provider.id);
    if (result.success) {
      toast({
        title: "Provider Deleted",
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

  return (
    <>
      <Button
        variant="destructive-outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Delete
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the provider{" "}
              <span className="font-semibold">"{provider.name}"</span> and all associated data, including users, courses, and analytics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
