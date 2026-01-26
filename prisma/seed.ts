

import { PrismaClient, FieldType } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { 
    roles as initialRoles,
    users as initialUsers,
    initialRegistrationFields,
} from '../src/lib/data';

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  // Seed Super Admin Role
  const superAdminRole = initialRoles.find(role => role.id === 'super-admin');
  if (superAdminRole) {
    await prisma.role.upsert({
      where: { id: superAdminRole.id },
      update: {
        permissions: superAdminRole.permissions as any,
      },
      create: {
        id: superAdminRole.id,
        name: superAdminRole.name,
        permissions: superAdminRole.permissions as any,
        trainingProviderId: undefined,
      },
    });
  }
  console.log('Seeded super admin role');

  // Seed Super Admin User
  const superAdminUser = initialUsers.find(user => user.role === 'super-admin');
  if (superAdminUser) {
    const password = `${superAdminUser.name.split(' ')[0].toLowerCase()}123!`;
    const hashedPassword = await bcrypt.hash(password, 10);

    const createdUser = await prisma.user.upsert({
      where: { id: superAdminUser.id },
      update: {
        password: hashedPassword,
        phoneNumber: superAdminUser.phoneNumber,
        passwordChangeRequired: true,
      },
      create: {
        id: superAdminUser.id,
        name: superAdminUser.name,
        email: superAdminUser.email,
        phoneNumber: superAdminUser.phoneNumber,
        avatarUrl: superAdminUser.avatarUrl,
        password: hashedPassword,
        passwordChangeRequired: true,
        trainingProviderId: null,
      },
    });

    const roleRecord = await prisma.role.findUnique({ where: { id: 'super-admin' } });
    if (roleRecord) {
      await prisma.userRole.upsert({
        where: { userId_roleId: { userId: createdUser.id, roleId: roleRecord.id } },
        update: {},
        create: {
          userId: createdUser.id,
          roleId: roleRecord.id,
        },
      });
    }
  }
  console.log('Seeded super admin user');

  // Seed Registration Fields
  for (const field of initialRegistrationFields) {
    await prisma.registrationField.upsert({
      where: { id: field.id },
      update: {
        label: field.label,
        type: field.type as FieldType,
        enabled: field.enabled,
        required: field.required,
      },
      create: {
        id: field.id,
        label: field.label,
        type: field.type as FieldType,
        enabled: field.enabled,
        required: field.required,
        options: field.options,
      }
    });
  }
  console.log('Seeded registration fields');

  console.log(`Seeding finished.`);
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

    

    

    