
import { PrismaClient, QuestionType, LiveSessionPlatform } from '@prisma/client'
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
  for (const district of initialDistricts) {
    await prisma.district.upsert({
      where: { id: district.id },
      update: {},
      create: district,
    });
  }
  console.log('Seeded districts');

  // Seed Departments
  for (const department of initialDepartments) {
    await prisma.department.upsert({
      where: { id: department.id },
      update: {},
      create: department,
    });
  }
  console.log('Seeded departments');

  // Seed Branches
  for (const branch of initialBranches) {
    await prisma.branch.upsert({
      where: { id: branch.id },
      update: {},
      create: branch,
    })
  }
  console.log('Seeded branches');
  
  // Seed Roles and Permissions
  for (const role of initialRoles) {
    await prisma.role.upsert({
      where: { id: role.id },
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
    const { department, district, branch, role, completedCourses, badges, ...userData } = user as any;

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
        where: { id: badge.id },
        update: {},
        create: badge,
    });
  }
  console.log('Seeded badges');

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
    const { modules, ...courseData } = course;
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
              platform: session.platform.replace(' ', '_') as LiveSessionPlatform
          },
          create: {
              ...sessionData,
              platform: session.platform.replace(' ', '_') as LiveSessionPlatform
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
                type: question.type.replace(/-/g, '_') as QuestionType,
                quizId: createdQuiz.id
            },
            create: {
                ...questionData,
                type: question.type.replace(/-/g, '_') as QuestionType,
                quizId: createdQuiz.id
            }
        });

        if (question.type === 'multiple_choice' || question.type === 'true_false') {
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
  
  // Seed UserCompletedCourse and UserBadge
  const user1 = await prisma.user.findUnique({ where: { email: 'staff@skillup.com' } });
  if (user1) {
    const user1Data = initialUsers.find(u => u.email === 'staff@skillup.com');
    if (user1Data?.completedCourses) {
        for (const completed of user1Data.completedCourses) {
            await prisma.userCompletedCourse.upsert({
                where: { userId_courseId: { userId: user1.id, courseId: completed.courseId } },
                update: {},
                create: {
                    userId: user1.id,
                    courseId: completed.courseId,
                    completionDate: completed.completionDate,
                    score: completed.score,
                }
            });
        }
    }
     if (user1Data?.badges) {
        for (const badge of user1Data.badges) {
             await prisma.userBadge.upsert({
                where: { userId_badgeId: { userId: user1.id, badgeId: badge.id } },
                update: {},
                create: { userId: user1.id, badgeId: badge.id },
            });
        }
    }
  }
  console.log('Seeded user completions and badges');

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
