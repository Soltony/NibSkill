

import prisma from "@/lib/db";
import { SettingsTabs } from "./settings-tabs";
import type { User, Role, RegistrationField, LoginHistory, District, Branch, Department } from "@prisma/client";
import { getSession } from "@/lib/auth";
import { notFound } from "next/navigation";

async function getSettingsData(trainingProviderId: string | null | undefined, userRole: string) {
    const whereClause: any = {};
    if (userRole !== 'Super Admin') {
        whereClause.trainingProviderId = trainingProviderId;
    }

    const users = await prisma.user.findMany({
        where: whereClause,
        include: { role: true },
        orderBy: { name: "asc" }
    });
    
    // Roles for Super Admin should be global only, for others it's their own + global non-super-admin roles
    const rolesWhere: any = {};
    if (userRole === 'Super Admin') {
        rolesWhere.trainingProviderId = null;
    } else {
        rolesWhere.OR = [
            { trainingProviderId },
            { trainingProviderId: null, name: { notIn: ['Super Admin', 'Training Provider'] } }
        ];
    }
    const roles = await prisma.role.findMany({
        where: rolesWhere,
        orderBy: { name: "asc" }
    });

    const registrationFields = await prisma.registrationField.findMany({
        where: { 
            OR: [
                whereClause,
                { trainingProviderId: null }
            ]
        },
        orderBy: { createdAt: "asc" }
    });

    const loginHistory = await prisma.loginHistory.findMany({
        where: { user: whereClause },
        include: { user: true },
        orderBy: { loginTime: "desc" },
        take: 100, // Limit to the last 100 logins for performance
    });

    const districts = await prisma.district.findMany({ 
        where: whereClause,
        orderBy: { name: 'asc' }
    });
    
    const branches = await prisma.branch.findMany({ 
        where: userRole === 'Super Admin' ? {} : { district: { trainingProviderId } },
        include: { district: true }, 
        orderBy: { name: 'asc' }
    });

    const departments = await prisma.department.findMany({ 
        where: whereClause,
        orderBy: { name: 'asc' }
    });

    return { users, roles, registrationFields, loginHistory, districts, branches, departments };
}


export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.id) {
    notFound();
  }

  const { users, roles, registrationFields, loginHistory, districts, branches, departments } = await getSettingsData(session.trainingProviderId, session.role.name);
  
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
        districts={districts}
        branches={branches as any}
        departments={departments}
      />
    </div>
  )
}
