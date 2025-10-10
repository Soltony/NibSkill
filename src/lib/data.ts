
import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

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

export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  department: string;
  district: string;
  branch: string;
  avatarUrl: string;
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
  type: 'video' | 'pdf' | 'slides';
  duration: number; // in minutes
  isCompleted: boolean;
};

export type Course = {
  id: string;
  title: string;
  description: string;
  productId: string;
  productName: string;
  image: ImagePlaceholder;
  modules: Module[];
  progress: number;
};

export type LiveSession = {
  id: string;
  title: string;
  description: string;
  speaker: string;
  keyTakeaways: string;
  dateTime: Date;
  platform: 'Zoom' | 'Google Meet';
  joinUrl: string;
};

export type Question = {
  id: string;
  text: string;
  type: 'multiple-choice' | 'true-false' | 'fill-in-the-blank';
  options: { id: string; text: string }[];
  correctAnswerId: string; // Also used for true/false (value will be 'true' or 'false') and fill-in-the-blank (value is the answer)
};


export type Quiz = {
  id:string;
  courseId: string;
  questions: Question[];
};

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

export const users: User[] = [
  {
    id: 'user-1',
    name: 'Alex Johnson',
    email: 'staff@skillup.com',
    role: 'staff',
    department: 'Engineering',
    district: 'North Region',
    branch: 'Main Office',
    avatarUrl: 'https://picsum.photos/seed/user1/100/100',
  },
  {
    id: 'user-2',
    name: 'Maria Garcia',
    email: 'admin@skillup.com',
    role: 'admin',
    department: 'HR',
    district: 'South Region',
    branch: 'Downtown Branch',
    avatarUrl: 'https://picsum.photos/seed/user2/100/100',
  },
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
    productName: 'FusionX',
    image: PlaceHolderImages[0],
    progress: 33,
    modules: [
      { id: 'm1-1', title: 'Introduction to FusionX', type: 'video', duration: 15, isCompleted: true },
      { id: 'm1-2', title: 'Core Features Deep Dive', type: 'video', duration: 45, isCompleted: false },
      { id: 'm1-3', title: 'FusionX Technical Specs', type: 'pdf', duration: 20, isCompleted: false },
    ],
  },
  {
    id: 'course-2',
    title: 'Advanced User Training for Centauri',
    description: 'Become a power user of our Centauri platform. This course is for experienced users who want to master advanced functionalities.',
    productId: 'prod-2',
    productName: 'Centauri',
    image: PlaceHolderImages[1],
    progress: 0,
    modules: [
      { id: 'm2-1', title: 'Centauri Architecture', type: 'slides', duration: 25, isCompleted: false },
      { id: 'm2-2', title: 'Automation and Scripting', type: 'video', duration: 60, isCompleted: false },
      { id: 'm2-3', title: 'API Integration Guide', type: 'pdf', duration: 30, isCompleted: false },
      { id: 'm2-4', title: 'Best Practices', type: 'video', duration: 20, isCompleted: false },
    ],
  },
  {
    id: 'course-3',
    title: 'Technical Deep Dive: Pulsar Engine',
    description: 'For our engineering team, a detailed look into the new Pulsar Engine, its capabilities, and how to build on top of it.',
    productId: 'prod-3',
    productName: 'Pulsar Engine',
    image: PlaceHolderImages[2],
    progress: 80,
    modules: [
        { id: 'm3-1', title: 'Pulsar Fundamentals', type: 'video', duration: 30, isCompleted: true },
        { id: 'm3-2', title: 'The Rendering Pipeline', type: 'slides', duration: 40, isCompleted: true },
        { id: 'm3-3', title: 'Performance Optimization', type: 'video', duration: 50, isCompleted: true },
        { id: 'm3-4', title: 'Extending Pulsar', type: 'pdf', duration: 20, isCompleted: true },
        { id: 'm3-5', title: 'Debugging and Profiling', type: 'video', duration: 35, isCompleted: false },
    ],
  },
  {
    id: 'course-4',
    title: 'Sales Strategy for Nova Suite',
    description: 'Equip your sales team with the knowledge and strategies to effectively sell the Nova Suite to enterprise clients.',
    productId: 'prod-4',
    productName: 'Nova Suite',
    image: PlaceHolderImages[3],
    progress: 100,
    modules: [
        { id: 'm4-1', title: 'Understanding the Market', type: 'slides', duration: 20, isCompleted: true },
        { id: 'm4-2', title: 'Identifying Key Personas', type: 'video', duration: 30, isCompleted: true },
        { id: 'm4-3', title: 'Handling Objections', type: 'pdf', duration: 15, isCompleted: true },
    ],
  },
];

export const liveSessions: LiveSession[] = [
  {
    id: 'ls-1',
    title: 'Live Q&A: FusionX for Enterprise',
    description: 'Join our lead product manager for a live Q&A session. Get your questions about FusionX answered and see a live demo of its enterprise capabilities.',
    speaker: 'Jane Doe, Lead Product Manager',
    keyTakeaways: 'In-depth answers to your questions, a live demonstration of advanced features, and a look at the product roadmap.',
    dateTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
    platform: 'Zoom',
    joinUrl: '#',
  },
  {
    id: 'ls-2',
    title: 'Workshop: Building with the Pulsar Engine',
    description: 'A hands-on workshop for developers. Follow along as we build a mini-application using the Pulsar Engine.',
    speaker: 'John Smith, Principal Engineer',
    keyTakeaways: 'Practical experience with the Pulsar SDK, tips for efficient development, and a complete sample project to take away.',
    dateTime: new Date(new Date().getTime() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    platform: 'Google Meet',
    joinUrl: '#',
  },
];

export const quizzes: Quiz[] = [
  {
    id: 'quiz-1',
    courseId: 'course-1',
    questions: [
      {
        id: 'q1-1',
        text: 'What is the primary new capability of FusionX?',
        type: 'multiple-choice',
        options: [
          { id: 'o1-1-1', text: 'AI-powered analytics' },
          { id: 'o1-1-2', text: 'Decentralized storage' },
          { id: 'o1-1-3', text: 'Real-time collaboration' },
          { id: 'o1-1-4', text: 'Quantum computing integration' },
        ],
        correctAnswerId: 'o1-1-1',
      },
      {
        id: 'q1-2',
        text: 'Which market segment is FusionX primarily targeting?',
        type: 'multiple-choice',
        options: [
          { id: 'o1-2-1', text: 'Small businesses' },
          { id: 'o1-2-2', text: 'Enterprise clients' },
          { id: 'o1-2-3', text: 'Individual consumers' },
          { id: 'o1-2-4', text: 'Educational institutions' },
        ],
        correctAnswerId: 'o1-2-2',
      },
    ],
  },
    {
    id: 'quiz-4',
    courseId: 'course-4',
    questions: [
      {
        id: 'q4-1',
        text: 'What is a key part of the Nova Suite sales strategy?',
        type: 'multiple-choice',
        options: [
          { id: 'o4-1-1', text: 'Focusing only on technical specs' },
          { id: 'o4-1-2', text: 'Identifying key decision-maker personas' },
          { id: 'o4-1-3', text: 'Offering large discounts immediately' },
          { id: 'o4-1-4', text: 'Avoiding discussion of competitors' },
        ],
        correctAnswerId: 'o4-1-2',
      },
    ],
  },
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
};
