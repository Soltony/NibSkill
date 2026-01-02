# Low-Level Design (LLD)

## 1. Introduction
This document provides a detailed, low-level design for the key modules of the NIB Training Platform. It includes database schema, API specifications, component logic, and error handling strategies.

---

## 2. Database Schema (Prisma)

Below is a simplified representation of the Prisma schema, focusing on key relationships. The addition of `RefreshToken` and `FailedLoginAttempt` models supports the enhanced security architecture.

```prisma
// User and Authentication
model User {
  id                 String   @id @default(cuid())
  name               String
  email              String   @unique
  phoneNumber        String?  @unique
  password           String
  avatarUrl          String?
  roleId             String
  role               Role     @relation(fields: [roleId], references: [id])
  trainingProviderId String?
  refreshTokens      RefreshToken[]
  failedLoginAttempts FailedLoginAttempt[]
  // ... other relations
}

model RefreshToken {
  id          String   @id @default(cuid())
  hashedToken String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime @default(now())
  revoked     Boolean  @default(false)
}

model FailedLoginAttempt {
  id        String   @id @default(cuid())
  ipAddress String
  userId    String?  // Can be null if the user doesn't exist
  user      User?    @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
}

model Role {
  id          String @id @default(cuid())
  name        String @unique
  permissions Json
  users       User[]
}

// Content Structure
model Product {
  id          String   @id @default(cuid())
  name        String
  description String
  imageUrl    String
  courses     Course[]
}

model Course {
  id          String   @id @default(cuid())
  title       String
  description String
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  modules     Module[]
  quiz        Quiz?
  isPaid      Boolean  @default(false)
  price       Float?
  // ... other fields
}

model Module {
  id        String   @id @default(cuid())
  title     String
  type      ModuleType // ENUM: VIDEO, PDF, AUDIO, SLIDES
  content   String
  courseId  String
  course    Course   @relation(fields: [courseId], references: [id])
  // ... other fields
}

// Assessments
model Quiz {
  id          String     @id @default(cuid())
  courseId    String     @unique
  course      Course     @relation(fields: [courseId], references: [id])
  questions   Question[]
  passingScore Int
  timeLimit   Int?
}

model Question {
  id              String   @id @default(cuid())
  text            String
  type            QuestionType // ENUM
  quizId          String
  quiz            Quiz     @relation(fields: [quizId], references: [id])
  options         Option[]
  correctAnswerId String
}

model Option {
  id         String   @id @default(cuid())
  text       String
  questionId String
  question   Question @relation(fields: [questionId], references: [id])
}
```

---

## 3. Module Design: User Authentication

### 3.1 Components & Hooks
- **`LoginPage` (`/login/page.tsx`)**: Collects credentials and calls the `/api/auth/login` endpoint.
- **`RootLayout` (`/app/layout.tsx`)**:
  - Contains the master session state for the client.
  - Fetches the user session on initial load.
  - Integrates the `useIdleTimeout` hook to monitor for inactivity.
- **`useIdleTimeout` (`/hooks/use-idle-timeout.ts`)**: Custom hook to track user activity (mouse, keyboard). After 15 minutes of inactivity, it triggers an `onIdle` callback.
- **`SessionTimeoutDialog` (`/components/session-timeout-dialog.tsx`)**: A modal dialog that appears on idle, warning the user of impending logout and providing an option to continue their session.

### 3.2 API Specifications

#### `POST /api/auth/login`
- **Purpose**: Authenticate a user and create a new session.
- **Request Body**: `{ "phoneNumber": string, "password": string, "loginAs": "staff" | "admin" }`
- **Process**:
  1.  Validates credentials against the `User` table.
  2.  Checks for and enforces IP-based rate limiting to prevent brute-force attacks.
  3.  On success, generates a short-lived **Access Token** (JWT, ~15 mins).
  4.  Generates a long-lived **Refresh Token**, hashes it, and stores it in the `RefreshToken` table.
- **Success Response (200)**: `{ "isSuccess": true, "accessToken": string, "redirectTo": string }` and sets a `refresh_token` cookie.
- **Cookie Details**: The `refresh_token` cookie is set with `HttpOnly`, `Secure`, and `SameSite=Strict` attributes.

#### `POST /api/auth/refresh`
- **Purpose**: To issue a new access token using a valid refresh token.
- **Authentication**: Requires a valid `refresh_token` cookie.
- **Process**:
  1.  Reads and hashes the `refresh_token` from the cookie.
  2.  Finds the token in the `RefreshToken` database table. If not found or revoked, returns 401.
  3.  **Token Rotation**: Marks the used refresh token as `revoked`.
  4.  Generates a *new* access token and a *new* refresh token.
  5.  Stores the new hashed refresh token in the database.
- **Success Response (200)**: `{ "accessToken": string }` and sets a new `refresh_token` cookie.

#### `POST /api/auth/logout`
- **Purpose**: To securely terminate a user session.
- **Authentication**: Requires a valid `refresh_token` cookie.
- **Process**:
  1.  Reads and hashes the `refresh_token` from the cookie.
  2.  Finds the corresponding token in the database and marks it as `revoked`.
  3.  Deletes the `refresh_token` cookie from the client's browser.
- **Success Response (200)**: `{ "success": true }`.

### 3.3 Middleware (`middleware.ts`)
- **Purpose**: To protect routes and handle initial session validation.
- **Logic**:
  1.  Checks if the requested path is public (e.g., `/login`). If so, allows access.
  2.  If a `refresh_token` cookie exists, the request is allowed to proceed. The client is responsible for handling access token lifecycle.
  3.  If no `refresh_token` exists and the path is not public, it redirects to `/login`.
  4.  **Mini-App Flow**: It checks for an `Authorization` header on initial load. If found, it triggers the `autoLoginFromMiniApp` function to create a session.
