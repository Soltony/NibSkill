
import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  department: z.string().optional(),
  district: z.string().optional(),
  branch: z.string().optional(),
  phoneNumber: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = registerSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({ isSuccess: false, errors: validation.error.issues.map(i => i.message) }, { status: 400 });
    }

    const { name, email, password, department, district, branch, phoneNumber } = validation.data;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ isSuccess: false, errors: ['User with this email already exists.'] }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Find the staff role
    const staffRole = await prisma.role.findUnique({
        where: { name: 'Staff' }
    });

    if (!staffRole) {
        return NextResponse.json({ isSuccess: false, errors: ['Staff role not found. Please seed the database.'] }, { status: 500 });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: staffRole.id,
        departmentId: department,
        districtId: district,
        branchId: branch,
        phoneNumber: phoneNumber,
        avatarUrl: `https://picsum.photos/seed/user${Date.now()}/100/100`,
      },
    });

    // In a real app, you'd generate and return JWT tokens here.
    // For this prototype, we'll just confirm success.
    return NextResponse.json({
      isSuccess: true,
      accessToken: 'dummy-access-token', // Placeholder
      refreshToken: 'dummy-refresh-token', // Placeholder
      errors: null,
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ isSuccess: false, errors: ['An unexpected server error occurred.'] }, { status: 500 });
  }
}
