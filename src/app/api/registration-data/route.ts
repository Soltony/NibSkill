
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const fields = await prisma.registrationField.findMany({ 
            where: { enabled: true },
            orderBy: { label: 'asc' }
        });
        const districtsData = await prisma.district.findMany({ orderBy: { name: 'asc' } });
        const branchesData = await prisma.branch.findMany({ orderBy: { name: 'asc' } });
        const departmentsData = await prisma.department.findMany({ orderBy: { name: 'asc' } });

        return NextResponse.json({
            fields,
            districtsData,
            branchesData,
            departmentsData
        });

    } catch (error) {
        console.error("Error fetching registration data:", error);
        return NextResponse.json({ message: "Failed to fetch registration data." }, { status: 500 });
    }
}
