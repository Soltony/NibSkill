
import type { ImagePlaceholder } from './placeholder-images';
import { placeholderImages as PlaceHolderImages } from './placeholder-images.json';
import { QuestionType as PrismaQuestionType } from '@prisma/client';

export type District = {
  id: string;
  name: string;
}

export type Branch = {
  id: string;
  name: string;
  districtId: string;
}

export type Department = {
  id: string;
  name: string;
}

export type Badge = {
    id: string;
    title: string;
    description: string;
    icon: string; // Using string for icon name from lucide-react
}

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  department: string;
  district: string;
  branch: string;
  avatarUrl: string;
  password?: string;
  phoneNumber?: string;
};

export type Product = {
  id: string;
  name: string;
  description: string;
  image: ImagePlaceholder;
}

export type Module = {
  id: string;
  title: string;
  description: string;
  type: 'video' | 'pdf' | 'slides' | 'audio';
  duration: number; // in minutes
  content: string; // URL to the content
};

export type Course = {
  id:string;
  title: string;
  description: string;
  productId: string;
  modules: Module[];
  image: ImagePlaceholder;
};

export type Question = {
    id: string;
    text: string;
    type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'SHORT_ANSWER';
    options: { id: string; text: string }[];
    correctAnswerId: string;
};
  
export type Quiz = {
    id: string;
    courseId: string;
    passingScore: number;
    timeLimit: number;
    quizType: 'OPEN_LOOP' | 'CLOSED_LOOP';
    questions: Question[];
};

export type LearningPath = {
  id: string;
  title: string;
  description: string;
  courseIds: string[];
}

export type LiveSession = {
  id: string;
  title: string;
  description: string;
  speaker: string;
  keyTakeaways: string;
  dateTime: Date;
  platform: 'Zoom' | 'Google_Meet';
  joinUrl: string;
  recordingUrl?: string;
  attendees?: string[]; // Array of user IDs
};

export type Permission = {
  c: boolean;
  r: boolean;
  u: boolean;
  d: boolean;
}

export type Role = {
    id: 'admin' | 'staff' | string;
    name: string;
    permissions: {
        courses: Permission;
        users: Permission;
        analytics: Permission;
        products: Permission;
        quizzes: Permission;
        staff: Permission;
        liveSessions: Permission;
    }
}

export type RegistrationField = {
  id: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT';
  enabled: boolean;
  required: boolean;
  options?: string[];
  isLoginIdentifier?: boolean;
}

export type Notification = {
    id: string;
    title: string;
    description: string;
    createdAt: Date;
    isRead: boolean;
};

export enum QuestionType {
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  TRUE_FALSE = 'TRUE_FALSE',
  FILL_IN_THE_BLANK = 'FILL_IN_THE_BLANK',
  SHORT_ANSWER = 'SHORT_ANSWER',
}

export enum ModuleType {
    VIDEO = 'video',
    PDF = 'pdf',
    SLIDES = 'slides',
    AUDIO = 'audio'
}

export enum FieldType {
    TEXT = "TEXT",
    NUMBER = "NUMBER",
    DATE = "DATE",
    SELECT = "SELECT"
}

export enum QuizType {
    OPEN_LOOP = "OPEN_LOOP",
    CLOSED_LOOP = "CLOSED_LOOP",
}

// To add more fields to the registration form, add them to this array.
// The `id` must be a unique string, and it will be used as the key in the form data.
export const initialRegistrationFields: RegistrationField[] = [
    { id: 'phoneNumber', label: 'Phone Number', type: 'TEXT', enabled: true, required: false },
    { id: 'department', label: 'Department', type: 'SELECT', enabled: true, required: true },
    { id: 'district', label: 'District', type: 'SELECT', enabled: true, required: true },
    { id: 'branch', label: 'Branch', type: 'SELECT', enabled: true, required: true },
]


export const districts: District[] = [
  { id: 'dist-1', name: 'North Region' },
  { id: 'dist-2', name: 'South Region' },
  { id: 'dist-3', name: 'East Region' },
  { id: 'dist-4', name: 'West Region' },
];

export const branches: Branch[] = [
  { id: 'br-1', name: 'Main Office', districtId: 'dist-1' },
  { id: 'br-2', name: 'Downtown Branch', districtId: 'dist-2' },
  { id: 'br-3', name: 'Suburb Branch', districtId: 'dist-3' },
  { id: 'br-4', name: 'Westside Office', districtId: 'dist-4' },
];

export const departments: Department[] = [
    { id: 'dept-1', name: 'Engineering' },
    { id: 'dept-2', name: 'Sales' },
    { id: 'dept-3', name: 'Marketing' },
    { id: 'dept-4', name: 'HR' },
];

export const badges: Badge[] = [
    { id: 'badge-1', title: 'First Steps', description: 'Complete your first course.', icon: 'Footprints' },
    { id: 'badge-2', title: 'Course Connoisseur', description: 'Complete 5 courses.', icon: 'BookOpenCheck' },
    { id: 'badge-3', title: 'Top Learner', description: 'Finish in the top 3 on the leaderboard.', icon: 'Trophy' },
    { id: 'badge-4', title: 'Perfect Score', description: 'Get a 100% on a quiz.', icon: 'Target' },
]

export const users: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'staff@nibtraining.com',
    role: 'staff',
    department: 'Engineering',
    district: 'North Region',
    branch: 'Main Office',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
    password: 'skillup123'
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'admin@nibtraining.com',
    role: 'admin',
    department: 'HR',
    district: 'South Region',
    branch: 'Downtown Branch',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100',
    password: 'skillup123'
  },
  { id: 'user-3', name: 'Samira Khan', email: 'samira.khan@example.com', avatarUrl: 'https://picsum.photos/seed/user3/100/100', role: 'staff', department: 'Engineering', district: 'North Region', branch: 'Main Office', password: 'skillup123' },
  { id: 'user-4', name: 'David Chen', email: 'david.chen@example.com', avatarUrl: 'https://picsum.photos/seed/user4/100/100', role: 'staff', department: 'Sales', district: 'South Region', branch: 'Downtown Branch', password: 'skillup123' },
  { id: 'user-5', name: 'Emily White', email: 'emily.white@example.com', avatarUrl: 'https://picsum.photos/seed/user5/100/100', role: 'staff', department: 'Engineering', district: 'North Region', branch: 'Main Office', password: 'skillup123' },
  { id: 'user-6', name: 'Michael Brown', email: 'michael.brown@example.com', avatarUrl: 'https://picsum.photos/seed/user6/100/100', role: 'staff', department: 'Marketing', district: 'East Region', branch: 'Suburb Branch', password: 'skillup123' },
];

export const products: Product[] = [
    {
      id: 'prod-1',
      name: 'FusionX',
      description: 'The next generation of enterprise data analytics.',
      image: PlaceHolderImages[0],
    },
    {
      id: 'prod-2',
      name: 'Centauri',
      description: 'A powerful CRM for managing customer relationships.',
      image: PlaceHolderImages[1],
    },
    {
      id: 'prod-3',
      name: 'Pulsar Engine',
      description: 'A real-time 3D rendering engine for immersive experiences.',
      image: PlaceHolderImages[2],
    },
    {
        id: 'prod-4',
        name: 'Nova Suite',
        description: 'A comprehensive suite of productivity tools for modern teams.',
        image: PlaceHolderImages[3],
    }
];

export const courses: Course[] = [
  {
    id: 'course-1',
    title: 'New Product Launch: FusionX',
    description: 'Get up to speed with our latest flagship product, FusionX. This course covers all the new features and selling points.',
    productId: 'prod-1',
    image: PlaceHolderImages[0],
    modules: [
      { id: 'm1-1', title: 'Introduction to FusionX', type: 'video', duration: 15, description: 'An overview of the new FusionX product.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { id: 'm1-2', title: 'Core Features Deep Dive', type: 'video', duration: 45, description: 'A detailed look at the core features of FusionX.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { id: 'm1-3', title: 'FusionX Technical Specs', type: 'pdf', duration: 20, description: 'The official technical specification document for FusionX.', content: '/sample.pdf' },
    ],
  },
  {
    id: 'course-2',
    title: 'Advanced User Training for Centauri',
    description: 'Become a power user of our Centauri platform. This course is for experienced users who want to master advanced functionalities.',
    productId: 'prod-2',
    image: PlaceHolderImages[1],
    modules: [
      { id: 'm2-1', title: 'Centauri Architecture', type: 'slides', duration: 25, description: 'An overview of the Centauri system architecture.', content: '#' },
      { id: 'm2-2', title: 'Automation and Scripting', type: 'video', duration: 60, description: 'Learn how to automate tasks using Centauri\'s scripting engine.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
      { id: 'm2-3', title: 'API Integration Guide', type: 'pdf', duration: 30, description: 'A guide to integrating with the Centauri API.', content: '/sample.pdf' },
      { id: 'm2-4', title: 'Best Practices', type: 'video', duration: 20, description: 'Best practices for using Centauri effectively.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'course-3',
    title: 'Technical Deep Dive: Pulsar Engine',
    description: 'For our engineering team, a detailed look into the new Pulsar Engine, its capabilities, and how to build on top of it.',
    productId: 'prod-3',
    image: PlaceHolderImages[2],
    modules: [
        { id: 'm3-1', title: 'Pulsar Fundamentals', type: 'video', duration: 30, description: 'The basics of the Pulsar Engine.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { id: 'm3-2', title: 'The Rendering Pipeline', type: 'slides', duration: 40, description: 'A deep dive into the rendering pipeline.', content: '#' },
        { id: 'm3-3', title: 'Performance Optimization', type: 'video', duration: 50, description: 'Tips and tricks for optimizing performance.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { id: 'm3-4', title: 'Extending Pulsar', type: 'pdf', duration: 20, description: 'How to extend the Pulsar Engine with custom plugins.', content: '/sample.pdf' },
        { id: 'm3-5', title: 'Debugging and Profiling', type: 'video', duration: 35, description: 'Learn to debug and profile your Pulsar applications.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
    ],
  },
  {
    id: 'course-4',
    title: 'Sales Strategy for Nova Suite',
    description: 'Equip your sales team with the knowledge and strategies to effectively sell the Nova Suite to enterprise clients.',
    productId: 'prod-4',
    image: PlaceHolderImages[3],
    modules: [
        { id: 'm4-1', title: 'Understanding the Market', type: 'slides', duration: 20, description: 'An overview of the current market landscape.', content: '#' },
        { id: 'm4-2', title: 'Identifying Key Personas', type: 'video', duration: 30, description: 'Learn to identify and target key customer personas.', content: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
        { id: 'm4-3', title: 'Handling Objections', type: 'pdf', duration: 15, description: 'A guide to handling common sales objections.', content: '/sample.pdf' },
    ],
  },
];

export const initialQuizzes: Quiz[] = [
    {
      id: 'quiz-1',
      courseId: 'course-1',
      passingScore: 80,
      timeLimit: 15,
      quizType: 'CLOSED_LOOP',
      questions: [
        {
          id: 'q1-1',
          text: 'What is the primary new capability of FusionX?',
          type: 'MULTIPLE_CHOICE',
          options: [
            { id: 'o1-1-1', text: 'AI-powered predictive analytics' },
            { id: 'o1-1-2', text: 'Enhanced user interface' },
            { id: 'o1-1-3', text: 'Real-time data streaming' },
          ],
          correctAnswerId: 'o1-1-1',
        },
        {
          id: 'q1-2',
          text: 'FusionX is primarily targeting enterprise clients.',
          type: 'TRUE_FALSE',
          options: [
            { id: 'o1-2-1', text: 'True' },
            { id: 'o1-2-2', text: 'False' },
          ],
          correctAnswerId: 'o1-2-1',
        },
      ],
    },
    {
        id: 'quiz-4',
        courseId: 'course-4',
        passingScore: 70,
        timeLimit: 0,
        quizType: 'CLOSED_LOOP',
        questions: [
          {
            id: 'q4-1',
            text: 'What is a key part of the Nova Suite sales strategy?',
            type: 'SHORT_ANSWER',
            options: [],
            correctAnswerId: 'Value-based selling',
          },
        ],
    },
  ];

export const learningPaths: LearningPath[] = [
    {
        id: 'lp-1',
        title: 'New Hire Onboarding',
        description: 'The essential courses for all new hires to get up to speed with company products and culture.',
        courseIds: ['course-1', 'course-4']
    }
];

export const roles: Role[] = [
  {
    id: "admin",
    name: "Admin",
    permissions: {
      courses: { c: true, r: true, u: true, d: true },
      users: { c: true, r: true, u: true, d: true },
      analytics: { c: false, r: true, u: false, d: false },
      products: { c: true, r: true, u: true, d: true },
      quizzes: { c: true, r: true, u: true, d: true },
      staff: { c: true, r: true, u: true, d: true },
      liveSessions: { c: true, r: true, u: true, d: true },
    }
  },
  {
    id: "staff",
    name: "Staff",
    permissions: {
      courses: { c: false, r: true, u: false, d: false },
      users: { c: false, r: false, u: false, d: false },
      analytics: { c: false, r: false, u: false, d: false },
      products: { c: false, r: false, u: false, d: false },
      quizzes: { c: false, r: true, u: false, d: false },
      staff: { c: false, r: false, u: false, d: false },
      liveSessions: { c: false, r: true, u: false, d: false },
    }
  },
]

export const liveSessions: LiveSession[] = [
  {
    id: 'ls-1',
    title: 'Live Q&A: FusionX for Enterprise',
    description: 'Join our lead product manager for a live Q&A session. Get your questions about FusionX answered and see a live demo of its enterprise capabilities.',
    speaker: 'Jane Doe, Lead Product Manager',
    keyTakeaways: 'In-depth answers to your questions, a live demonstration of advanced features, and a look at the product roadmap.',
    dateTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    platform: 'Zoom',
    joinUrl: 'https://your-company.zoom.us/j/1234567890',
    recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    attendees: [],
  },
  {
    id: 'ls-2',
    title: 'Workshop: Building with the Pulsar Engine',
    description: 'A hands-on workshop for developers. Follow along as we build a mini-application using the Pulsar Engine.',
    speaker: 'John Smith, Principal Engineer',
    keyTakeaways: 'Practical experience with the Pulsar SDK, tips for efficient development, and a complete sample project to take away.',
    dateTime: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    platform: 'Google_Meet',
    joinUrl: 'https://meet.google.com/abc-defg-hij',
    recordingUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    attendees: ['user-1'],
  },
];

const detailedProgressReport = [
    ...users.map(user => {
        return courses.map(course => ({
            userId: user.id,
            userName: user.name,
            userEmail: user.email,
            department: user.department,
            district: user.district,
            branch: user.branch,
            courseId: course.id,
            courseTitle: course.title,
            progress: (user.name.length + course.title.length) % 81, // Modulo 81 to keep it under 80
        }));
    }).flat()
];


export const analyticsData = {
  kpis: {
    totalUsers: 142,
    avgCompletionRate: 78,
    avgScore: 89,
  },
  completionByDept: [
    { department: 'Engineering', completionRate: 92 },
    { department: 'Sales', completionRate: 85 },
    { department: 'Marketing', completionRate: 71 },
    { department: 'HR', completionRate: 65 },
  ],
  scoresDistribution: [
    { range: '0-59%', count: 5 },
    { range: '60-69%', count: 12 },
    { range: '70-79%', count: 28 },
    { range: '80-89%', count: 45 },
    { range: '90-100%', count: 35 },
  ],
  leaderboard: [
    { id: 'user-3', name: 'Samira Khan', avatarUrl: 'https://picsum.photos/seed/user3/100/100', coursesCompleted: 12, department: 'Engineering' },
    { id: 'user-4', name: 'David Chen', avatarUrl: 'https://picsum.photos/seed/user4/100/100', coursesCompleted: 10, department: 'Sales' },
    { id: 'user-5', name: 'Emily White', avatarUrl: 'https://picsum.photos/seed/user5/100/100', coursesCompleted: 9, department: 'Engineering' },
    { id: 'user-6', name: 'Michael Brown', email: 'michael.brown@example.com', avatarUrl: 'https://picsum.photos/seed/user6/100/100', role: 'staff', department: 'Marketing', district: 'East Region', branch: 'Suburb Branch', coursesCompleted: 8 },
    { id: 'user-1', name: 'Alex Johnson', avatarUrl: 'https://picsum.photos/seed/user1/100/100', coursesCompleted: 7, department: 'Engineering' },
  ].map(({ coursesCompleted, ...rest }) => ({...rest, coursesCompleted})),
  courseEngagement: {
    mostCompleted: [
        { id: 'course-4', title: 'Sales Strategy for Nova Suite', completionRate: 98 },
        { id: 'course-1', title: 'New Product Launch: FusionX', completionRate: 95 },
        { id: 'course-3', title: 'Technical Deep Dive: Pulsar Engine', completionRate: 91 },
    ],
    leastCompleted: [
        { id: 'course-x', title: 'Legacy Systems 101', completionRate: 45 },
        { id: 'course-y', title: 'Advanced Compliance Training', completionRate: 52 },
        { id: 'course-2', title: 'Advanced User Training for Centauri', completionRate: 61 },
    ]
  },
  quizQuestionAnalysis: [
    {
      questionId: 'q1-1',
      courseTitle: 'New Product Launch: FusionX',
      questionText: 'What is the primary new capability of FusionX?',
      correctAttempts: 110,
      incorrectAttempts: 15,
    },
    {
      questionId: 'q1-2',
      courseTitle: 'New Product Launch: FusionX',
      questionText: 'FusionX is primarily targeting enterprise clients.',
      correctAttempts: 120,
      incorrectAttempts: 5,
    },
    {
      questionId: 'q1-3',
      courseTitle: 'New Product Launch: FusionX',
      questionText: 'What technology powers the new analytics features? ...',
      correctAttempts: 95,
      incorrectAttempts: 30,
    },
     {
      questionId: 'q4-1',
      courseTitle: 'Sales Strategy for Nova Suite',
      questionText: 'What is a key part of the Nova Suite sales strategy?',
      correctAttempts: 130,
      incorrectAttempts: 2,
    },
  ],
  detailedProgressReport,
};

export const notifications: Notification[] = [
    {
        id: 'notif-1',
        title: 'Live Session Reminder',
        description: 'Live Q&A: FusionX for Enterprise starts in 24 hours.',
        createdAt: new Date(new Date().getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
        isRead: false,
    },
    {
        id: 'notif-2',
        title: 'New Course Assigned',
        description: 'You have been assigned the "Advanced User Training for Centauri" course.',
        createdAt: new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        isRead: true,
    },
    {
        id: 'notif-3',
        title: 'Course Completion',
        description: 'Congratulations! You have completed "Sales Strategy for Nova Suite".',
        createdAt: new Date(new Date().getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        isRead: true,
    },
];

export type UserBadge = {
    userId: string;
    badgeId: string;
}

export type UserCompletedCourse = {
    userId: string;
    courseId: string;
    completionDate: Date;
    score: number;
}

    