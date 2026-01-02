"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { LogOut } from "lucide-react";

interface SessionTimeoutDialogProps {
  open: boolean;
  onContinue: () => void;
  onLogout: () => void;
  countdown: number;
}

export function SessionTimeoutDialog({
  open,
  onContinue,
  onLogout,
  countdown,
}: SessionTimeoutDialogProps) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you still there?</AlertDialogTitle>
          <AlertDialogDescription>
            You've been inactive for a while. For your security, you will be
            logged out automatically in{" "}
            <span className="font-bold">{countdown}</span> seconds.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onContinue}>
            I'm still here
          </AlertDialogAction>
          <AlertDialogAction variant="destructive" onClick={onLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Log Out Now
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
