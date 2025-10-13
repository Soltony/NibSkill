
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
    await prisma.role.upsert({
      where: { name: role.name },
      update: {
        permissions: role.permissions as any,
      },
      create: {
        id: role.id,
        name: role.name,
        permissions: role.permissions as any,
      },
    });
  }
  console.log('Seeded roles');

  // Seed Users
  for (const user of initialUsers) {
    const { department, district, branch, role, completedCourses, badges: userBadges, ...userData } = user as any;

    // Find the corresponding IDs from the seeded data
    const departmentRecord = await prisma.department.findUnique({ where: { name: department } });
    const districtRecord = await prisma.district.findUnique({ where: { name: district } });
    const branchRecord = await prisma.branch.findFirst({ where: { name: branch, districtId: districtRecord?.id } });
    const roleRecord = await prisma.role.findUnique({ where: { name: role === 'admin' ? 'Admin' : 'Staff' } });
    
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
  for (const badge of initialBadges) {
    await prisma.badge.upsert({
        where: { title: badge.title },
        update: {},
        create: badge,
    });
  }

  // Assign badges to user-1
  const user1 = await prisma.user.findUnique({ where: { email: 'staff@skillup.com' } });
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
    console.log('Seeded badges and assigned to user');
  } else {
    console.log('Badges already assigned to user.');
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
        title: courseData.title,
        description: courseData.description,
        productId: courseData.productId,
      },
      create: {
        id: courseData.id,
        title: courseData.title,
        description: courseData.description,
        productId: courseData.productId,
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
        id: path.id,
        title: path.title,
        description: path.description,
        courses: {
          create: path.courseIds.map(courseId => ({
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
      await prisma.liveSession.upsert({
          where: { id: session.id },
          update: {
              ...sessionData,
              platform: session.platform === 'Google Meet' ? 'Google_Meet' : 'Zoom'
          },
          create: {
              ...sessionData,
              platform: session.platform === 'Google Meet' ? 'Google_Meet' : 'Zoom'
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
                type: question.type.replace('-', '_') as any,
                quizId: createdQuiz.id
            },
            create: {
                ...questionData,
                type: question.type.replace('-', '_') as any,
                quizId: createdQuiz.id
            }
        });

        if (question.type === 'multiple-choice' || question.type === 'true-false') {
            for (const option of options) {
                await prisma.option.upsert({
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

  