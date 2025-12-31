
"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";
import type { User } from "@prisma/client";
import { resendCredentialsEmail } from "../actions/user-actions";

type ResendAdminEmailButtonProps = {
  admin: User;
};

export function ResendAdminEmailButton({ admin }: ResendAdminEmailButtonProps) {
  const { toast } = useToast();

  const handleResend = async () => {
    if (!admin.email) {
      toast({
        title: "Error",
        description: "This admin does not have an email address on file.",
        variant: "destructive",
      });
      return;
    }
    const result = await resendCredentialsEmail(admin.id);
    if (result.success) {
      toast({
        title: "Email Sent",
        description: `A new password has been sent to ${admin.name}.`,
      });
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Button variant="outline" size="sm" onClick={handleResend}>
      <Mail className="mr-2 h-4 w-4" />
      Resend Email
    </Button>
  );
}
