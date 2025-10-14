
import prisma from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";
import type { User, Role, RegistrationField } from "@prisma/client";

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
        users={users as (User & { role: Role })[]} 
        roles={roles}
        registrationFields={registrationFields}
      />
    </div>
  )
}
