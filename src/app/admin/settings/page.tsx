
"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { users as initialUsers, roles as initialRoles, type User, type Role, type Permission, initialRegistrationFields } from "@/lib/data";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { MoreHorizontal, PlusCircle, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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
import { FeatureNotImplementedDialog } from "@/components/feature-not-implemented-dialog";
import { Switch } from "@/components/ui/switch";
import type { RegistrationField } from "@/lib/data";
import { AddFieldDialog } from "@/components/add-field-dialog";
import prisma from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";

async function getSettingsData() {
    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { name: "asc" }
    });

    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" }
    });

    const registrationFields = await prisma.registrationField.findMany({
        orderBy: { label: "asc" }
    });

    return { users, roles, registrationFields };
}


export default async function SettingsPage() {
  const { users, roles, registrationFields } = await getSettingsData();
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage application settings, users, and roles.
        </p>
      </div>
      <SettingsTabs 
        users={users} 
        roles={roles}
        registrationFields={registrationFields}
      />
    </div>
  )
}
