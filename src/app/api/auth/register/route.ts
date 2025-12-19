
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
  trainingProviderId: z.string({ required_error: "Please select a training provider." }),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: validation.error.issues.map(i => i.message) }, { status: 400 });
    }

    const { name, email, password, department, district, branch, phoneNumber, trainingProviderId } = validation.data;

    const staffRole = await prisma.role.findFirst({
        where: { 
            name: 'Staff',
            trainingProviderId: trainingProviderId
        }
    });

    if (!staffRole) {
        return NextResponse.json({ isSuccess: false, errors: ['Default "Staff" role not found for the selected provider.'] }, { status: 500 });
    }
    
    // Check if a user with this phone number and role already exists for the provider
    const existingUser = await prisma.user.findFirst({
        where: {
            phoneNumber,
            trainingProviderId,
            roles: {
                some: {
                    roleId: staffRole.id
                }
            }
        }
    });

    if (existingUser) {
        return NextResponse.json({ isSuccess: false, errors: ['A user with this phone number and role already exists for this provider.'] }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.create({
      data: {
        name,
        email: email || null,
        password: hashedPassword,
        departmentId: department || null,
        districtId: district || null,
        branchId: branch || null,
        phoneNumber: phoneNumber,
        avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
        trainingProviderId: trainingProviderId,
        roles: {
            create: {
                roleId: staffRole.id
            }
        }
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
             // This might still catch other unique constraints if any are added in the future
             return NextResponse.json({ isSuccess: false, errors: ['A user with this information might already exist.'] }, { status: 409 });
        }
    }
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
