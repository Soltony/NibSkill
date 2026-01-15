"use client"

import React from 'react'
import type { Permission } from '@prisma/client'
import { cn } from '@/lib/utils'

export const CrudPermissions = ({ permissions }: { permissions: any }) => {
  const letters: (keyof Permission)[] = ['c', 'r', 'u', 'd'];
  return (
    <div className="flex space-x-1 tracking-widest">
      {letters.map(letter => (
        <span
          key={letter}
          className={cn(
            'font-mono font-bold',
            permissions && permissions[letter] ? 'text-green-500' : 'text-muted-foreground/30'
          )}
        >
          {letter.toUpperCase()}
        </span>
      ))}
    </div>
  )
}
