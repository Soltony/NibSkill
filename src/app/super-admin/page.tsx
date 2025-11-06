
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import prisma from "@/lib/db"
import { AddProviderDialog } from "./add-provider-dialog"
import type { TrainingProvider, User } from "@prisma/client"
import { EditProviderDialog } from "./edit-provider-dialog"
import { DeleteProviderButton } from "./delete-provider-button"

type ProviderWithAdmin = TrainingProvider & { users: User[] };
export const dynamic = "force-dynamic";

export default async function SuperAdminDashboard() {
  const providers: ProviderWithAdmin[] = await prisma.trainingProvider.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      users: {
        where: { role: { name: 'Training Provider' } },
        take: 1,
      }
    }
  });

  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Super Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage all training providers in the system.
          </p>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Training Providers</CardTitle>
              <CardDescription>
                A list of all registered training providers.
              </CardDescription>
            </div>
            <AddProviderDialog />
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider Name</TableHead>
                  <TableHead>Admin Name</TableHead>
                  <TableHead>Admin Email</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => {
                  const admin = provider.users[0];
                  return (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">
                          {provider.name}
                      </TableCell>
                      <TableCell>{admin?.name || 'N/A'}</TableCell>
                      <TableCell>{admin?.email || 'N/A'}</TableCell>
                      <TableCell>{provider.accountNumber}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            <EditProviderDialog provider={provider} admin={admin} />
                            <DeleteProviderButton providerId={provider.id} providerName={provider.name} />
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                 {providers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                            No training providers registered yet.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  )
}
