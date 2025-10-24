

import { PrismaClient, QuestionType, LiveSessionPlatform, ModuleType, FieldType, QuizType, Currency } from '@prisma/client'
import bcrypt from 'bcryptjs'
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
    roles as initialRoles,
    initialRegistrationFields,
    initialQuizzes
} from '../src/lib/data';

const prisma = new PrismaClient()

async function main() {
  console.log(`Start seeding ...`)

  const provider = await prisma.trainingProvider.upsert({
    where: { name: 'NIB Training' },
    update: {},
    create: {
      name: 'NIB Training',
      address: '123 Training Ave, Skill City, USA',
      accountNumber: 'NIB-001',
    },
  });
  console.log('Upserted training provider');


  // Seed Districts
  for (const district of initialDistricts) {
    await prisma.district.upsert({
      where: { id: district.id },
      update: { name: district.name },
      create: { ...district, trainingProviderId: provider.id }
    });
  }
  console.log('Seeded districts');

  // Seed Departments
  for (const department of initialDepartments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: { name: department.name },
      create: { ...department, trainingProviderId: provider.id }
    });
  }
  console.log('Seeded departments');

  // Seed Branches
  for (const branch of initialBranches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: { name: branch.name, districtId: branch.districtId },
      create: { ...branch, trainingProviderId: provider.id }
    })
  }
  console.log('Seeded branches');
  
  // Seed Roles and Permissions
  for (const role of initialRoles) {
    const isGlobal = role.id === 'super-admin' || role.id === 'provider-admin';
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        permissions: role.permissions as any,
      },
      create: {
        id: role.id,
        name: role.name,
        permissions: role.permissions as any,
        trainingProviderId: isGlobal ? undefined : provider.id,
      },
    });
  }
  console.log('Seeded roles');

  // Seed Users
  for (const user of initialUsers) {
    const { id, department, district, branch, role, password, ...userData } = user as any;

    // Find related records
    const departmentRecord = await prisma.department.findFirst({ where: { name: department, trainingProviderId: provider.id } });
    const districtRecord = await prisma.district.findFirst({ where: { name: district, trainingProviderId: provider.id } });
    const branchRecord = await prisma.branch.findFirst({ where: { name: branch, districtId: districtRecord?.id, trainingProviderId: provider.id } });
    
    let roleRecord;
    if (role === 'admin') roleRecord = await prisma.role.findFirst({ where: { name: 'Admin', trainingProviderId: provider.id } });
    else if (role === 'super-admin') roleRecord = await prisma.role.findUnique({ where: { name: 'Super Admin' } });
    else if (role === 'provider-admin') roleRecord = await prisma.role.findUnique({ where: { name: 'Training Provider' } });
    else roleRecord = await prisma.role.findFirst({ where: { name: 'Staff', trainingProviderId: provider.id } });
    
    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const isSuperAdmin = role === 'super-admin';

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        password: hashedPassword,
      },
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        password: hashedPassword,
        departmentId: departmentRecord?.id,
        districtId: districtRecord?.id,
        branchId: branchRecord?.id,
        roleId: roleRecord!.id,
        trainingProviderId: isSuperAdmin ? null : provider.id,
      },
    });
  }
  console.log('Seeded users');


  // Seed Badges
  for (const badge of initialBadges) {
    await prisma.badge.upsert({
        where: { id: badge.id },
        update: {},
        create: badge,
    });
  }
  console.log('Seeded badges');

  // Assign badges to user-1
  const user1 = await prisma.user.findUnique({ where: { email: 'staff@nibtraining.com' } });
  const firstStepsBadge = await prisma.badge.findUnique({ where: { title: 'First Steps' }});
  const perfectScoreBadge = await prisma.badge.findUnique({ where: { title: 'Perfect Score' }});

  if (user1 && firstStepsBadge && perfectScoreBadge) {
    await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: user1.id, badgeId: firstStepsBadge.id } },
        update: {},
        create: { userId: user1.id, badgeId: firstStepsBadge.id },
    });
    await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: user1.id, badgeId: perfectScoreBadge.id } },
        update: {},
        create: { userId: user1.id, badgeId: perfectScoreBadge.id },
    });
    console.log('Assigned badges to user');
  }

  // Seed Products
  for (const product of initialProducts) {
    await prisma.product.upsert({
        where: { id: product.id },
        update: {},
        create: {
            id: product.id,
            name: product.name,
            description: product.description,
            imageUrl: product.image.imageUrl,
            imageHint: product.image.imageHint,
            trainingProviderId: provider.id,
        }
    })
  }
  console.log('Seeded products');

  // Seed Courses and Modules
  for (const course of initialCourses) {
    const { modules, image, ...courseData } = course as any;
    const createdCourse = await prisma.course.upsert({
      where: { id: course.id },
      update: {
        title: courseData.title,
        description: courseData.description,
        productId: courseData.productId,
        isPaid: courseData.isPaid,
        price: courseData.price,
        currency: courseData.currency,
        hasCertificate: courseData.hasCertificate,
        status: courseData.status,
      },
      create: {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        productId: courseData.productId,
        isPaid: courseData.isPaid,
        price: courseData.price,
        currency: courseData.currency,
        imageUrl: image?.imageUrl,
        imageDescription: image?.description,
        imageHint: image?.imageHint,
        hasCertificate: courseData.hasCertificate,
        status: courseData.status || 'PENDING',
        trainingProviderId: provider.id,
      }
    });

    for (const module of modules) {
      const moduleType = module.type.toUpperCase() as ModuleType;
      await prisma.module.upsert({
        where: { id: module.id },
        update: { ...module, type: moduleType, courseId: createdCourse.id },
        create: { ...module, type: moduleType, courseId: createdCourse.id },
      });
    }
  }
  console.log('Seeded courses and modules');

  // Seed Learning Paths
  for (const path of initialLearningPaths) {
    await prisma.learningPath.upsert({
      where: { id: path.id },
      update: {
        hasCertificate: path.hasCertificate,
      },
      create: {
        id: path.id,
        title: path.title,
        description: path.description,
        hasCertificate: path.hasCertificate,
        trainingProviderId: provider.id,
        courses: {
          create: path.courseIds.map((courseId, index) => ({
            order: index + 1,
            course: {
              connect: { id: courseId }
            }
          }))
        }
      }
    });
  }
  console.log('Seeded learning paths');

  // Seed Live Sessions
  for (const session of initialLiveSessions) {
      const { attendees, ...sessionData } = session;
      const { allowedAttendees, ...rest } = sessionData as any;
      const platform = session.platform.replace(' ', '_') as LiveSessionPlatform;
      await prisma.liveSession.upsert({
          where: { id: session.id },
          update: {
              ...rest,
              platform: platform
          },
          create: {
              ...rest,
              platform: platform,
              trainingProviderId: provider.id,
          }
      });
  }
  console.log('Seeded live sessions');

  // Seed Quizzes and Questions
  for (const quiz of initialQuizzes) {
    const { questions, ...quizData } = quiz;
    const quizType = quiz.quizType.toUpperCase() as QuizType;
    const requiresManualGrading = quizType === 'CLOSED_LOOP' && questions.some(q => q.type === 'FILL_IN_THE_BLANK' || q.type === 'SHORT_ANSWER');

    const createdQuiz = await prisma.quiz.upsert({
        where: { id: quiz.id },
        update: { ...quizData, quizType: quizType, requiresManualGrading },
        create: { ...quizData, quizType: quizType, requiresManualGrading },
    });

    for (const question of questions) {
        const { options, ...questionData } = question;
        const questionType = question.type.toUpperCase() as QuestionType;
        const createdQuestion = await prisma.question.upsert({
            where: { id: question.id },
            update: {
                ...questionData,
                type: questionType,
                quizId: createdQuiz.id
            },
            create: {
                ...questionData,
                type: questionType,
                quizId: createdQuiz.id
            }
        });

        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
            await prisma.option.deleteMany({ where: { questionId: createdQuestion.id } });
            for (const option of options) {
                await prisma.option.create({
                    data: {
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
  const user1ForCompletion = await prisma.user.findUnique({ where: { email: 'staff@nibtraining.com' } });
  if (user1ForCompletion) {
    const course4 = await prisma.course.findUnique({ where: { id: 'course-4' } });
    if (course4) {
      await prisma.userCompletedCourse.upsert({
        where: { userId_courseId: { userId: user1ForCompletion.id, courseId: course4.id } },
        update: {},
        create: {
          userId: user1ForCompletion.id,
          courseId: course4.id,
          completionDate: new Date('2024-05-10'),
          score: 100,
        }
      });
    }
  }
  console.log('Seeded user completed courses');
  
  // Seed Certificate Template
  await prisma.certificateTemplate.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
        id: 'singleton',
        title: "Certificate of Completion",
        organization: "NIB Training Inc.",
        body: "This certificate is proudly presented to [Student Name] for successfully completing the [Course Name] course on [Completion Date].",
        signatoryName: "Jane Doe",
        signatoryTitle: "Head of Training & Development",
    }
  });
  console.log('Seeded certificate template');


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

    