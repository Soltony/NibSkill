

import prisma from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";
import type { User, Role, RegistrationField, LoginHistory } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getSettingsData(trainingProviderId: string) {
    const users = await prisma.user.findMany({
        where: { trainingProviderId },
        include: { role: true },
        orderBy: { name: "asc" }
    });

    const roles = await prisma.role.findMany({
        where: {
            OR: [
                { trainingProviderId },
                { trainingProviderId: null } // Include global roles
            ]
        },
        orderBy: { name: "asc" }
    });

    const registrationFields = await prisma.registrationField.findMany({
        where: { 
            OR: [
                { trainingProviderId },
                { trainingProviderId: null }
            ]
        },
        orderBy: { createdAt: "asc" }
    });

    const loginHistory = await prisma.loginHistory.findMany({
        where: { user: { trainingProviderId } },
        include: { user: true },
        orderBy: { loginTime: "desc" },
        take: 100, // Limit to the last 100 logins for performance
    });

    return { users, roles, registrationFields, loginHistory };
}


export default async function SettingsPage() {
  const session = await getSession();
  if (!session || !session.trainingProviderId) {
    notFound();
  }

  const { users, roles, registrationFields, loginHistory } = await getSettingsData(session.trainingProviderId);
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Settings</h1>
        <p className="text-muted-foreground">
          Manage application settings, users, and roles.
        </p>
      </div>
      <SettingsTabs 
        users={users as (User & { role: Role })[]} 
        roles={roles}
        registrationFields={registrationFields}
        loginHistory={loginHistory as (LoginHistory & { user: User })[]}
      />
    </div>
  )
}
