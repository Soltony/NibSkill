# Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This document provides a detailed specification of the requirements for the NIB Training Platform. It serves as the foundational agreement between stakeholders and the development team, outlining all functional and non-functional requirements for the system.

### 1.2 Scope
The NIB Training Platform is a web-based and mini-app-integrated system designed to facilitate corporate training and development. Key capabilities include:
- Multi-role user management (Super Admin, Admin, Staff).
- A comprehensive training library with courses, modules, and learning paths.
- User progress tracking and assessments via quizzes.
- Integration with live session platforms and a secure payment gateway for paid content.
- Analytics and reporting for administrators.

### 1.3 Definitions, Acronyms, and Abbreviations
- **HLR**: High-Level Requirement
- **LLR**: Low-Level Requirement
- **NIB**: National Investment Bank
- **Mini-App**: An application running within the NIBtera Super App ecosystem.
- **SRS**: Software Requirements Specification
- **HLD**: High-Level Design
- **LLD**: Low-Level Design

---

## 2. User Roles and Characteristics

| Role              | Description                                                                                                   | Key Permissions & Responsibilities                                                                                                 |
|-------------------|---------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------|
| **Super Admin**   | The top-level administrator with full system control. Responsible for managing training providers.               | - Register and manage Training Providers and their administrators.<br>- Full access to all system settings and data.              |
| **Admin**         | Manages the training content and users for a specific Training Provider.                                      | - Manage users, roles, and permissions.<br>- Create and manage courses, learning paths, and products.<br>- View analytics and reports. |
| **Staff**         | The end-user of the training platform. Accesses and consumes training content.                                 | - View and enroll in courses/learning paths.<br>- Track personal progress.<br>- Take quizzes and view results.<br>- Attend live sessions.     |

---

## 3. System Features and Requirements

### 3.1 Functional Requirements

#### 3.1.1 User Management (HLR-1, HLR-2)
- **FR-1.1**: The system shall allow Admins to register new users with roles (Staff, Admin).
- **FR-1.2**: Super Admins shall be able to register new Training Providers and assign a Provider Admin.
- **FR-1.3**: The system must support secure login via email/password for web users.
- **FR-1.4**: Users in the NIBtera Mini-App shall be authenticated automatically via a secure token.

#### 3.1.2 Content Management (HLR-3, HLR-4)
- **FR-2.1**: Admins shall be able to define company "Products" which serve as categories for courses.
- **FR-2.2**: Admins must be able to create courses with titles, descriptions, and images.
- **FR-2.3**: Each course shall support modules of different types: Video, PDF, Audio, and Slides.
- **FR-2.4**: An approval workflow shall exist; courses must be approved by an Admin before publication.
- **FR-2.5**: Admins can create "Learning Paths" by arranging multiple courses in a specific sequence.

#### 3.1.3 Training and Progress Tracking (HLR-4, HLR-5)
- **FR-3.1**: Staff users shall have a personal dashboard showing available courses and progress.
- **FR-3.2**: Users can mark individual modules as complete.
- **FR-3.3**: For Learning Paths, course completion must be sequential.
- **FR-3.4**: A progress bar shall visually represent a user's completion of a course or learning path.

#### 3.1.4 Assessment and Certification (HLR-6, HLR-10)
- **FR-4.1**: Admins shall be able to create a quiz for any course, defining a passing score and time limit.
- **FR-4.2**: Quizzes must support Multiple Choice, True/False, Fill-in-the-Blank, and Short Answer questions.
- **FR-4.3**: Quizzes with manually graded questions shall appear in a "Grading" queue for Admins.
- **FR-4.4**: The system will automatically generate a customizable certificate upon successful completion of a designated course or path.

#### 3.1.5 Live Sessions (HLR-7)
- **FR-5.1**: Admins can schedule live sessions with details like title, speaker, date/time, and join URL.
- **FR-5.2**: Live sessions can be restricted to specific staff members.
- **FR-5.3**: Users can view upcoming/past sessions and mark their attendance.

#### 3.1.6 Payments (HLR-9)
- **FR-6.1**: Admins can mark a course as "Paid" and set a price.
- **FR-6.2**: For mini-app users, buying a course initiates a secure payment flow with the NIB Payment Gateway.
- **FR-6.3**: All communication with the payment gateway must be cryptographically signed.
- **FR-6.4**: The system must provide a callback endpoint to securely verify payment confirmation.

### 3.2 Non-Functional Requirements

- **NFR-1 (Performance)**: Web pages must load within 3 seconds on a standard internet connection. API responses should be processed within 500ms.
- **NFR-2 (Scalability)**: The system should be able to handle a 50% increase in concurrent users over 6 months without significant performance degradation.
- **NFR-3 (Security)**: All user data, especially passwords and session tokens, must be encrypted. The system must be protected against common web vulnerabilities (XSS, CSRF, SQL Injection).
- **NFR-4 (Usability)**: The user interface must be intuitive and accessible, adhering to WCAG 2.1 AA standards.
- **NFR-5 (Maintainability)**: The codebase must be well-documented, modular, and follow consistent coding standards to facilitate easy updates and bug fixes.

---

## 4. Use Cases & User Stories

### 4.1 Use Case: Admin Creates a New Course
- **Actor**: Admin
- **Precondition**: Admin is logged in. At least one Product exists.
- **Flow**:
  1. Admin navigates to the "Course Management" page.
  2. Clicks "Add Course".
  3. Fills in the course title, description, and selects the associated Product.
  4. Sets the course as free or paid. If paid, sets the price.
  5. Submits the course for approval.
  6. The system lists the course in the "Approvals" queue.

### 4.2 User Story: Staff Member Completes a Module
- **As a** Staff member,
- **I want to** watch a video module and mark it as complete,
- **So that** I can track my progress through the course and unlock the final quiz.

---

## 5. Constraints and Assumptions

- **Constraints**:
  - The application must be built using Next.js, React, and Prisma.
  - Deployment will be on a serverless web hosting platform.
  - Payment integration is exclusively with the NIB Payment Gateway.
- **Assumptions**:
  - A stable internet connection is available for users.
  - The NIB Payment Gateway and NIBtera Super App APIs are reliable and well-documented.
  - Users will access the platform via modern web browsers or the NIBtera Mini-App.
