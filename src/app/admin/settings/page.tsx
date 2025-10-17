
import prisma from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";
import type { User, Role, RegistrationField, LoginHistory } from "@prisma/client";

async function getSettingsData() {
    const users = await prisma.user.findMany({
        include: { role: true },
        orderBy: { name: "asc" }
    });

    const roles = await prisma.role.findMany({
        orderBy: { name: "asc" }
    });

    const registrationFields = await prisma.registrationField.findMany({
        orderBy: { createdAt: "asc" }
    });

    const loginHistory = await prisma.loginHistory.findMany({
        include: { user: true },
        orderBy: { loginTime: "desc" },
        take: 100, // Limit to the last 100 logins for performance
    });

    return { users, roles, registrationFields, loginHistory };
}


export default async function SettingsPage() {
  const { users, roles, registrationFields, loginHistory } = await getSettingsData();
  
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
