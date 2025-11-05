
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6),
  department: z.string().optional(),
  district: z.string().optional(),
  branch: z.string().optional(),
  phoneNumber: z.string().min(1, "Phone number is required"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: validation.error.issues.map(i => i.message) }, { status: 400 });
    }

    const { name, email, password, department, district, branch, phoneNumber } = validation.data;

    const existingUser = await prisma.user.findFirst({
        where: {
            OR: [
                { email: email || undefined }, // Don't search for empty string email
                { phoneNumber }
            ]
        }
    });

    if (existingUser) {
        if (email && existingUser.email === email) {
            return NextResponse.json({ isSuccess: false, errors: ['User with this email already exists.'] }, { status: 409 });
        }
        if (existingUser.phoneNumber === phoneNumber) {
            return NextResponse.json({ isSuccess: false, errors: ['User with this phone number already exists.'] }, { status: 409 });
        }
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Find the staff role for the default training provider
    const provider = await prisma.trainingProvider.findFirst();
    if (!provider) {
        return NextResponse.json({ isSuccess: false, errors: ['Default training provider not found.'] }, { status: 500 });
    }
    
    const staffRole = await prisma.role.findFirst({
        where: { 
            name: 'Staff',
            trainingProviderId: provider.id
        }
    });

    if (!staffRole) {
        return NextResponse.json({ isSuccess: false, errors: ['Staff role not found for the provider.'] }, { status: 500 });
    }
    
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        password: hashedPassword,
        roleId: staffRole.id,
        departmentId: department,
        districtId: district,
        branchId: branch,
        phoneNumber: phoneNumber,
        avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
        trainingProviderId: provider.id,
      },
    });

    return NextResponse.json({
      isSuccess: true,
      errors: null,
    });

  } catch (error) {
    console.error('Registration error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
             if ((error.meta?.target as string[])?.includes('email')) {
                return NextResponse.json({ isSuccess: false, errors: ['User with this email already exists.'] }, { status: 409 });
             }
             if ((error.meta?.target as string[])?.includes('phoneNumber')) {
                return NextResponse.json({ isSuccess: false, errors: ['User with this phone number already exists.'] }, { status: 409 });
             }
        }
    }
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
