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
       | HTTPS / API Calls (with Access Token)
       v
[Next.js Application on a Serverless Platform]
  |    /      \
  |   /        \
[Middleware] [API Routes (e.g., /api/auth/*)] [Server/Client Components]
  |      |         |                            |
  |      |         |                            | (Client-side Idle Timer)
  |      |---------+-----------> [Prisma ORM] -> [PostgreSQL Database]
  |      |                                        (Users, RefreshTokens, etc.)
  |      +----------------------> [NIB Payment Gateway API]
  |
  +-----------------------------> [NIBtera Super App (for Auth)]

```

### 2.2 Technology Stack

| Component         | Technology/Service                                       | Rationale                                                                                                       |
|-------------------|----------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------|
| **Frontend**      | Next.js (React), TypeScript, Tailwind CSS, ShadCN        | Modern, performant UI with server-side rendering and a robust component library.                                |
| **Backend/API**   | Next.js API Routes                                       | Integrated serverless functions for backend logic, collocated with the frontend.                                |
| **Database**      | PostgreSQL                                               | A powerful, open-source relational database.                                                                    |
| **ORM**           | Prisma                                                   | Provides type-safe database access and simplifies data modeling.                                                |
| **Authentication**| JWT (Access/Refresh Tokens), bcrypt, `HttpOnly` cookies    | Secure, robust session management using short-lived access tokens and rotating, long-lived refresh tokens.        |
| **Deployment**    | Serverless Web Hosting (e.g., Vercel)                    | A managed, serverless platform for deploying modern web apps.                                                   |

---

## 3. Module Descriptions

The application is broken down into several logical modules:

1.  **Authentication & Session Management**: Handles user login, registration, and session validation. It uses a sophisticated token-based strategy:
    -   **Access Tokens**: Short-lived JWTs (15 minutes) sent in the `Authorization` header for API requests. Stored in client-side memory.
    -   **Refresh Tokens**: Long-lived, single-use tokens stored in a secure, `HttpOnly` cookie. They are persisted in the database and used only to obtain new access/refresh token pairs.
    -   **Token Rotation**: Each time a refresh token is used, it is invalidated and a new one is issued, enhancing security.
    -   **Server-Side Logout**: On logout, the refresh token is revoked in the database, ensuring immediate and complete session invalidation.
    -   **Rate Limiting**: Authentication endpoints (`/login`, `/refresh`) are rate-limited by IP to prevent brute-force attacks.
    -   **Inactivity Timeout**: A client-side timer monitors user activity. After 15 minutes of inactivity, a warning appears, and if there is no response, the user is automatically logged out.
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
1.  **User** submits credentials on the Login Page.
2.  **Client** sends a POST request to `/api/auth/login`.
3.  **API Route** validates credentials and checks for rate-limiting.
4.  If valid, it generates:
    -   A short-lived **Access Token** (JWT), returned in the response body.
    -   A long-lived **Refresh Token**, stored hashed in the database and sent to the client as a secure, `HttpOnly` cookie.
5.  **Client** stores the access token in memory and is redirected to their dashboard.

### 5.2 Access Token Refresh Flow
1.  **Client** makes an API request with an expired Access Token.
2.  The API responds with a `401 Unauthorized` error.
3.  A client-side interceptor catches the 401 error and sends a POST request to `/api/auth/refresh`. This request automatically includes the `HttpOnly` refresh token cookie.
4.  The **Refresh API Route** validates the refresh token against the database, revokes it, and generates a new access token and a new refresh token.
5.  The new access token is returned in the response body, and the new refresh token is set as a new `HttpOnly` cookie.
6.  The **Client** updates its in-memory access token and automatically retries the original failed API request.

### 5.3 Course Creation Data Flow
1.  **Admin** submits the "Add Course" form.
2.  **Client** calls the `addCourse` server action with the form data and a valid Access Token.
3.  **Server Action** validates the data and token, then creates a new `Course` record in the database.
4.  The action calls `revalidatePath` to update the server-rendered course list page.
5.  **Client** sees a success toast notification.

---

## 6. Deployment Architecture

- The application is a monolithic Next.js project deployed to a **serverless web hosting platform**.
- The platform provides a managed environment that automatically handles scaling, logging, and security.
- The PostgreSQL database is hosted separately (e.g., on Google Cloud SQL, Supabase, or another provider) and is connected via a secure connection string stored in environment variables.
- Static assets (JS, CSS, images) are automatically distributed via a global CDN for fast delivery.
