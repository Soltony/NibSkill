
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

export default async function SuperAdminDashboard() {
  const providers = await prisma.trainingProvider.findMany({
    orderBy: { createdAt: 'desc' },
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers.map((provider) => (
                  <TableRow key={provider.id}>
                    <TableCell className="font-medium">
                        {provider.name}
                    </TableCell>
                    <TableCell>{provider.adminFirstName} {provider.adminLastName}</TableCell>
                    <TableCell>{provider.adminEmail}</TableCell>
                    <TableCell>{provider.accountNumber}</TableCell>
                  </TableRow>
                ))}
                 {providers.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
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
