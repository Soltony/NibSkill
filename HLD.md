# High-Level Design (HLD)

## 1. Introduction
This document outlines the high-level architecture and design of the NIB Training Platform. It describes the major components, their interactions, and the technology stack used to build the system.

---

## 2. System Architecture

The NIB Training Platform is built on a modern, serverless web architecture that leverages Next.js for both frontend and backend capabilities.

### 2.1 Architectural Diagram (Text-Based)

```
[User's Browser / NIBtera Mini-App]
       |
       | HTTPS / API Calls
       v
[Next.js Application on a Serverless Platform]
  |    /      \
  |   /        \
[Middleware] [API Routes] [Server/Client Components]
  |      |         |
  |      |         |
  |      |---------+-----------> [Prisma ORM] -> [PostgreSQL Database]
  |      |
  |      +----------------------> [NIB Payment Gateway API]
  |
  +-----------------------------> [NIBtera Super App (for Auth)]
```

### 2.2 Technology Stack

| Component         | Technology/Service                                | Rationale                                                                      |
|-------------------|---------------------------------------------------|--------------------------------------------------------------------------------|
| **Frontend**      | Next.js (React), TypeScript, Tailwind CSS, ShadCN | Modern, performant UI with server-side rendering and a robust component library. |
| **Backend/API**   | Next.js API Routes                                | Integrated serverless functions for backend logic, collocated with the frontend. |
| **Database**      | PostgreSQL                                        | A powerful, open-source relational database.                                   |
| **ORM**           | Prisma                                            | Provides type-safe database access and simplifies data modeling.               |
| **Authentication**| JWT (Jose), bcrypt                                | Secure, stateless session management using JSON Web Tokens.                    |
| **Deployment**    | Serverless Web Hosting (e.g., Vercel, App Hosting)| A managed, serverless platform for deploying modern web apps.                  |

---

## 3. Module Descriptions

The application is broken down into several logical modules:

1.  **Authentication & Session Management**: Handles user login, registration, and session validation using JWTs stored in secure cookies. Middleware intercepts requests to protect routes.
2.  **User & Admin Dashboards**: Separate UI modules for Staff and Admin users, providing role-specific views and functionalities.
3.  **Content Management Module**: A set of components and API routes for Admins to create, update, and manage products, courses, modules, and learning paths.
4.  **Learning & Progress Module**: Components for Staff to consume course content, take quizzes, and track their progress. Server actions handle state changes.
5.  **Payment Integration Module**: A dedicated set of API routes (`/api/payment/*`) to handle secure communication with the NIB Payment Gateway.
6.  **Analytics & Reporting**: Server-side logic to aggregate data and client-side components to display reports and charts for Admins.

---

## 4. Integrations and APIs

### 4.1 NIB Payment Gateway
- **Purpose**: To process payments for paid courses.
- **Flow**:
  1. Client initiates payment via `/api/payment/initiate`.
  2. The API sends a signed payload to the NIB Gateway.
  3. The gateway returns a `paymentToken`.
  4. Client passes this token to the NIBtera Mini-App to open the native payment UI.
  5. After payment, the NIB Gateway sends a confirmation to `/api/payment/callback`.

### 4.2 NIBtera Super App
- **Purpose**: For seamless authentication within the mini-app environment.
- **Flow**:
  1. Middleware detects an `Authorization` header on the initial request.
  2. It calls `/api/connect` to validate the token and retrieve the user's phone number.
  3. The system then logs the user in automatically, creating a session.

---

## 5. Data Flow

### 5.1 User Login Data Flow
1.  **User** submits email/password to the Login Page.
2.  **Client** sends a POST request to `/api/auth/login`.
3.  **API Route** validates credentials against the `User` table in the database.
4.  If valid, a **JWT** is generated and set as a secure, HTTP-only cookie.
5.  **Client** is redirected to their respective dashboard (`/dashboard` or `/admin/analytics`).

### 5.2 Course Creation Data Flow
1.  **Admin** submits the "Add Course" form.
2.  **Client** calls the `addCourse` server action with the form data.
3.  **Server Action** validates the data and creates a new `Course` record in the database.
4.  The action calls `revalidatePath` to update the server-rendered course list page.
5.  **Client** sees a success toast notification.

---

## 6. Deployment Architecture

- The application is a monolithic Next.js project deployed to a **serverless web hosting platform**.
- The platform provides a managed environment that automatically handles scaling, logging, and security.
- The PostgreSQL database is hosted separately (e.g., on Google Cloud SQL, Supabase, or another provider) and is connected via a secure connection string stored in environment variables.
- Static assets (JS, CSS, images) are automatically distributed via a global CDN for fast delivery.
