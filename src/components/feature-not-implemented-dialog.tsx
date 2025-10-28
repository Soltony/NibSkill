
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "./ui/dropdown-menu"

type FeatureNotImplementedDialogProps = {
  title: string
  description: string
  isMenuItem?: boolean
  children: React.ReactNode
}

export function FeatureNotImplementedDialog({
  title,
  description,
  isMenuItem = false,
  children,
}: FeatureNotImplementedDialogProps) {
  const [open, setOpen] = useState(false)

  const TriggerComponent = isMenuItem ? DropdownMenuItem : DialogTrigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TriggerComponent 
          asChild
          onSelect={(e) => {
            if (isMenuItem) e.preventDefault()
          }}
      >
        {children}
      </TriggerComponent>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  )
}
