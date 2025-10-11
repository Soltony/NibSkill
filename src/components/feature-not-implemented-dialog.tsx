
"use client"

import { useState } from "react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DropdownMenuItem } from "./ui/dropdown-menu"
import { type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

type FeatureNotImplementedDialogProps = {
  title: string
  description: string
  triggerText?: string
  triggerIcon?: React.ReactNode
  isMenuItem?: boolean
  children?: React.ReactNode
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"]
  triggerSize?: VariantProps<typeof buttonVariants>["size"]
}

export function FeatureNotImplementedDialog({
  title,
  description,
  triggerText,
  triggerIcon,
  isMenuItem = false,
  children,
  triggerVariant,
  triggerSize,
}: FeatureNotImplementedDialogProps) {
  const [open, setOpen] = useState(false)

  const TriggerComponent = isMenuItem ? DropdownMenuItem : Button;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <TriggerComponent 
            onSelect={(e) => {
              if (isMenuItem) e.preventDefault()
            }}
            {...(!isMenuItem ? { 
                variant: triggerVariant,
                size: triggerSize,
                children: <>{triggerIcon}{triggerText || children}</>
            } : {})}
        >
          {isMenuItem ? children : null}
        </TriggerComponent>
      </DialogTrigger>
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
