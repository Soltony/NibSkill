# NIB Training Platform: Requirements Document

## 1. High-Level Requirements (HLR)

This section outlines the major functional capabilities of the training platform.

| ID      | Requirement                                                                                                         |
|---------|---------------------------------------------------------------------------------------------------------------------|
| HLR-1   | The system shall support multiple user roles with distinct permissions (Super Admin, Admin, Staff).                 |
| HLR-2   | The system shall provide secure user registration and login for both web and mini-app users.                        |
| HLR-3   | The system shall allow administrators to create and manage a comprehensive training content library.                |
| HLR-4   | The system shall deliver courses and structured learning paths to staff members.                                    |
| HLR-5   | The system shall track user progress and performance across all training materials.                                 |
| HLR-6   | The system shall support assessments through quizzes with various question types.                                   |
| HLR-7   | The system shall facilitate live, instructor-led training sessions.                                                 |
| HLR-8   | The system shall provide analytics and reporting on user engagement and performance.                                |
| HLR-9   | The system shall support the purchase of paid courses through the NIB payment gateway.                               |
| HLR-10  | The system shall automatically award customizable certificates upon completion of courses or learning paths.          |

## 2. Low-Level Requirements (LLR)

This section breaks down the high-level requirements into specific, testable functionalities.

### 2.1 User Management & Authentication (HLR-1, HLR-2)

| ID       | Requirement                                                                                                                   |
|----------|-------------------------------------------------------------------------------------------------------------------------------|
| LLR-1.1  | Admins shall be able to register new users with roles (Staff, Admin).                                                        |
| LLR-1.2  | Super Admins shall be able to register new Training Providers and their respective administrators.                               |
| LLR-1.3  | Users shall be able to log in using an email and password on the web interface.                                                 |
| LLR-1.4  | Users accessing from the NIBtera Mini-App shall be logged in automatically via a secure token-based authentication flow.    |
| LLR-1.5  | The system shall maintain an audit log of user login history, capturing IP address and user agent.                            |
| LLR-1.6  | Role permissions (Create, Read, Update, Delete) shall be configurable by an Admin for various application modules.             |

### 2.2 Content Management (HLR-3, HLR-4)

| ID       | Requirement                                                                                                                              |
|----------|------------------------------------------------------------------------------------------------------------------------------------------|
| LLR-2.1  | Admins shall be able to define company Products, which act as categories for courses.                                                    |
| LLR-2.2  | Admins shall be able to create courses, associating each with a product and providing a title, description, and image.                   |
| LLR-2.3  | Courses shall support modules of different types: Video, PDF, Audio, and Slides.                                                         |
| LLR-2.4  | Course creation shall include an approval workflow; courses must be approved by an admin before being published to staff.                |
| LLR-2.5  | Admins shall be able to create Learning Paths by arranging multiple courses into a specific sequence.                                      |

### 2.3 Training & User Experience (HLR-4, HLR-5)

| ID       | Requirement                                                                                                                                |
|----------|--------------------------------------------------------------------------------------------------------------------------------------------|
| LLR-3.1  | Staff users shall have a personal dashboard to view available courses and their current progress.                                          |
| LLR-3.2  | Users shall be able to mark individual modules as complete, and this progress shall be persisted.                                          |
| LLR-3.3  | For Learning Paths, users must complete courses in the predefined sequential order.                                                        |
| LLR-3.4  | A user's overall progress for a course or learning path shall be visually represented with a progress bar.                                 |

### 2.4 Assessment & Certification (HLR-6, HLR-10)

| ID       | Requirement                                                                                                                                   |
|----------|-----------------------------------------------------------------------------------------------------------------------------------------------|
| LLR-4.1  | Admins shall be able to create a quiz for any course, setting a passing score and an optional time limit.                                     |
| LLR-4.2  | Quizzes shall support Multiple Choice, True/False, Fill-in-the-Blank, and Short Answer questions.                                             |
| LLR-4.3  | The system shall feature a "Grading" queue for quizzes containing Short Answer or Fill-in-the-Blank questions that require manual review.    |
| LLR-4.4  | A user's course completion, including the final score, shall be recorded upon passing a quiz.                                                 |
| LLR-4.5  | The system shall allow an Admin to design a certificate template, including organization name, logo, signatory, and styling.                   |
| LLR-4.6  | A certificate shall be automatically generated and made available to a user upon successful completion of a course or path that has one enabled. |

### 2.5 Live Sessions (HLR-7)

| ID       | Requirement                                                                                                                         |
|----------|-------------------------------------------------------------------------------------------------------------------------------------|
| LLR-5.1  | Admins shall be able to schedule live sessions with details such as title, speaker, date/time, platform (Zoom/Meet), and join URL. |
| LLR-5.2  | Live sessions can be designated as "Restricted" and assigned to specific staff members.                                             |
| LLR-5.3  | Users shall be able to view upcoming and past live sessions.                                                                        |
| LLR-5.4  | Users shall be able to mark their attendance for a live session.                                                                    |
| LLR-5.5  | Admins shall be able to view attendance records for each live session.                                                              |

### 2.6 Payments (HLR-9)

| ID       | Requirement                                                                                                                                 |
|----------|---------------------------------------------------------------------------------------------------------------------------------------------|
| LLR-6.1  | Admins shall be able to mark a course as "Paid" and set a price and currency (USD/ETB).                                                     |
| LLR-6.2  | For users in the mini-app, clicking "Buy Course" shall initiate a secure payment flow with the NIB Payment Gateway.                           |
| LLR-6.3  | The system shall use a secure `miniapp-auth-token` to authenticate payment initiation requests.                                               |
| LLR-6.4  | All communication with the payment gateway must be cryptographically signed to ensure data integrity.                                       |
| LLR-6.5  | The system must provide a callback endpoint (`/api/payment/callback`) to securely receive and verify payment confirmation from the NIB gateway. |
