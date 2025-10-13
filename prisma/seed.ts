
import { PrismaClient } from '@prisma/client'
import { 
    districts as initialDistricts,
    branches as initialBranches,
    departments as initialDepartments,
    badges as initialBadges,
    users as initialUsers,
    products as initialProducts,
    courses as initialCourses,
    learningPaths as initialLearningPaths,
    liveSessions as initialLiveSessions,
    quizzes as initialQuizzes,
    roles as initialRoles,
    initialRegistrationFields
} from '../src/lib/data';

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  // Seed Districts
  await prisma.district.createMany({
    data: initialDistricts,
    skipDuplicates: true,
  });
  console.log('Seeded districts');

  // Seed Departments
  await prisma.department.createMany({
    data: initialDepartments,
    skipDuplicates: true,
  });
  console.log('Seeded departments');

  // Seed Branches
  await prisma.branch.createMany({
    data: initialBranches,
    skipDuplicates: true,
  })
  console.log('Seeded branches');
  
  // Seed Roles and Permissions
  for (const role of initialRoles) {
    const { permissions, ...roleData } = role;
    const createdRole = await prisma.role.upsert({
      where: { id: role.id },
      update: roleData,
      create: roleData,
    });

    for (const [resource, p] of Object.entries(permissions)) {
      await prisma.permission.upsert({
        where: {
          roleId_resource: {
            roleId: createdRole.id,
            resource: resource,
          },
        },
        update: {
          c: p.c,
          r: p.r,
          u: p.u,
          d: p.d,
        },
        create: {
          roleId: createdRole.id,
          resource: resource,
          c: p.c,
          r: p.r,
          u: p.u,
          d: p.d,
        },
      });
    }
  }
  console.log('Seeded roles and permissions');

  // Seed Users
  for (const user of initialUsers) {
    const { department, district, branch, role, completedCourses, badges: userBadges, ...userData } = user;

    // Find the corresponding IDs from the seeded data
    const departmentRecord = await prisma.department.findFirst({ where: { name: department } });
    const districtRecord = await prisma.district.findFirst({ where: { name: district } });
    const branchRecord = await prisma.branch.findFirst({ where: { name: branch } });
    const roleRecord = await prisma.role.findUnique({ where: { id: role } });

    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        ...userData,
        departmentId: departmentRecord?.id,
        districtId: districtRecord?.id,
        branchId: branchRecord?.id,
        roleId: roleRecord!.id,
      }
    });
  }
  console.log('Seeded users');

  // Seed Badges
  await prisma.badge.createMany({
    data: initialBadges,
    skipDuplicates: true
  });

  // Assign badges to user-1
  const user1 = await prisma.user.findUnique({ where: { email: 'staff@skillup.com' } });
  if (user1) {
    await prisma.user.update({
        where: { id: user1.id },
        data: {
            badges: {
                connect: [
                    { id: 'badge-1' },
                    { id: 'badge-4' }
                ]
            }
        }
    })
  }
  console.log('Seeded badges and assigned to user');

  // Seed Products
  for (const product of initialProducts) {
    await prisma.product.upsert({
        where: { id: product.id },
        update: {
            name: product.name,
            description: product.description,
            imageUrl: product.image.imageUrl,
            imageDescription: product.image.description,
            imageHint: product.image.imageHint,
        },
        create: {
            id: product.id,
            name: product.name,
            description: product.description,
            imageUrl: product.image.imageUrl,
            imageDescription: product.image.description,
            imageHint: product.image.imageHint,
        }
    })
  }
  console.log('Seeded products');

  // Seed Courses and Modules
  for (const course of initialCourses) {
    const { modules, image, ...courseData } = course;
    const createdCourse = await prisma.course.upsert({
      where: { id: course.id },
      update: {
        ...courseData,
        imageUrl: image.imageUrl,
        imageDescription: image.description,
        imageHint: image.imageHint,
      },
      create: {
        ...courseData,
        imageUrl: image.imageUrl,
        imageDescription: image.description,
        imageHint: image.imageHint,
      }
    });

    for (const module of modules) {
      await prisma.module.upsert({
        where: { id: module.id },
        update: { ...module, courseId: createdCourse.id },
        create: { ...module, courseId: createdCourse.id },
      });
    }
  }
  console.log('Seeded courses and modules');

  // Seed Learning Paths
  for (const path of initialLearningPaths) {
    await prisma.learningPath.upsert({
      where: { id: path.id },
      update: {},
      create: {
        ...path,
        courses: {
          connect: path.courseIds.map(id => ({ id }))
        }
      }
    });
  }
  console.log('Seeded learning paths');

  // Seed Live Sessions
  for (const session of initialLiveSessions) {
      const { attendees, ...sessionData } = session;
      await prisma.liveSession.upsert({
          where: { id: session.id },
          update: {
              ...sessionData
          },
          create: {
              ...sessionData,
              attendees: attendees ? {
                  connect: attendees.map(id => ({ id }))
              } : undefined
          }
      });
  }
  console.log('Seeded live sessions');

  // Seed Quizzes and Questions
  for (const quiz of initialQuizzes) {
    const { questions, ...quizData } = quiz;
    const createdQuiz = await prisma.quiz.upsert({
        where: { id: quiz.id },
        update: quizData,
        create: quizData,
    });
    for (const question of questions) {
        const { options, ...questionData } = question;
        const createdQuestion = await prisma.question.upsert({
            where: { id: question.id },
            update: {
                ...questionData,
                quizId: createdQuiz.id
            },
            create: {
                ...questionData,
                quizId: createdQuiz.id
            }
        });

        if (question.type === 'multiple-choice' || question.type === 'true-false') {
            for (const option of options) {
                await prisma.questionOption.upsert({
                    where: { id: option.id },
                    update: {
                        text: option.text,
                        questionId: createdQuestion.id,
                    },
                    create: {
                        id: option.id,
                        text: option.text,
                        questionId: createdQuestion.id,
                    }
                });
            }
        }
    }
  }
  console.log('Seeded quizzes and questions');
  
  // Seed UserCompletedCourse
  const user1ForCompletion = await prisma.user.findUnique({ where: { email: 'staff@skillup.com' } });
  if (user1ForCompletion) {
    const course4 = await prisma.course.findUnique({ where: { id: 'course-4' } });
    if (course4) {
      await prisma.userCompletedCourse.create({
        data: {
          userId: user1ForCompletion.id,
          courseId: course4.id,
          completionDate: new Date('2024-05-10'),
          score: 100,
        }
      });
    }
  }
  console.log('Seeded user completed courses');


  // Seed Registration Fields
  await prisma.registrationField.createMany({
    data: initialRegistrationFields.map(({ id, label }) => ({ id, label })),
    skipDuplicates: true,
  });

  for (const field of initialRegistrationFields) {
    await prisma.registrationFieldSetting.upsert({
        where: { fieldId: field.id },
        update: {
            enabled: field.enabled,
            required: field.required,
        },
        create: {
            fieldId: field.id,
            enabled: field.enabled,
            required: field.required,
        }
    });
  }
  console.log('Seeded registration fields and settings');


  console.log(`Seeding finished.`)
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

