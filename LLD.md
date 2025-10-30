# Low-Level Design (LLD)

## 1. Introduction
This document provides a detailed, low-level design for the key modules of the NIB Training Platform. It includes database schema, API specifications, component logic, and error handling strategies.

---

## 2. Database Schema (Prisma)

Below is a simplified representation of the Prisma schema, focusing on key relationships.

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
  // ... other relations
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

## 3. Module Design: Payment Flow

### 3.1 Components
- **`CourseDetailClient` (`/courses/[courseId]/course-detail-client.tsx`)**:
  - Displays the "Buy Course" button for paid courses.
  - Contains the `handleBuyCourse` function.
  - **Logic**: On button click, sets a loading state (`isPaying`) and makes a POST request to `/api/payment/initiate`. On success, it uses the `window.myJsChannel` to pass the `paymentToken` to the native mini-app shell. It displays error toasts on failure.

### 3.2 API Specifications

#### `POST /api/payment/initiate`
- **Purpose**: To start a payment transaction with the NIB Gateway.
- **Request Body**: `{ "amount": number }`
- **Authentication**: Requires a valid `miniapp-auth-token` cookie.
- **Process**:
  1. Reads the `miniapp-auth-token` from cookies.
  2. Validates that `amount` and the token are present.
  3. Retrieves payment gateway credentials (`ACCOUNT_NO`, `CALLBACK_URL`, etc.) from environment variables.
  4. Generates a unique `transactionId` and a formatted `transactionTime`.
  5. Constructs the `signatureString` by concatenating all required parameters and the `NIB_PAYMENT_KEY`.
  6. Hashes the string using SHA-256 to create the `signature`.
  7. Sends the complete payload to the `NIB_PAYMENT_URL`.
- **Success Response (200)**: `{ "success": true, "paymentToken": string, "transactionId": string }`
- **Error Response (401/500)**: `{ "success": false, "message": string }`

#### `POST /api/payment/callback`
- **Purpose**: Secure endpoint for the NIB Gateway to confirm transaction status.
- **Authentication**: Validates a `Bearer` token in the `Authorization` header.
- **Process**:
  1. Validates the bearer token via an external API call.
  2. Verifies the cryptographic signature of the incoming payload to ensure data integrity.
  3. **(Future Logic)**: Finds the transaction in the local database using `transactionId`.
  4. **(Future Logic)**: If valid, updates the transaction status and grants the user access to the course.
- **Success Response (200)**: `{ "message": "Payment confirmed and updated." }`
- **Error Response (400/401)**: `{ "message": "Invalid signature." / "Invalid token." }`

### 3.3 Error Handling
- **Client-Side**: `handleBuyCourse` uses a `try...catch` block. Any failure in the API call results in a user-facing toast notification from `useToast`.
- **API-Side**:
  - Missing environment variables result in a `500 Server Configuration Error`.
  - Missing `miniapp-auth-token` results in a `401 Unauthorized` error.
  - Failures from the NIB Gateway are logged to the console, and a generic error is returned to the client to avoid leaking sensitive information.

---

## 4. Module Design: User Authentication

### 4.1 Component Diagram (Text-Based)
```
[LoginPage] --submits form--> [handleLogin] --POST--> [/api/auth/login]
                                                            |
                                                            v
                                            [Prisma] -> [Database]
                                                            | (verifies user)
                                                            v
                                            [Jose] ----> (Generates JWT)
                                                            | (Sets cookie)
                                                            v
                                            <--redirect-- [Dashboard]
```

### 4.2 Middleware (`middleware.ts`)
- **Purpose**: To protect routes and handle session validation for every request.
- **Logic**:
  1. Checks if the requested path is public (e.g., `/login`). If so, allows access.
  2. If a `session` cookie exists, it verifies the JWT using `jose.jwtVerify`.
     - If valid, the request proceeds.
     - If invalid (expired/tampered), it deletes the cookie and redirects to `/login`.
  3. If no session cookie exists and the path is not public, it redirects to `/login`.
  4. **Mini-App Flow**: It checks for an `Authorization` header on initial load. If found, it triggers the `autoLoginFromMiniApp` function to create a session.

### 4.3 `getSession()` Utility (`/lib/auth.ts`)
- **Purpose**: A server-side utility to securely retrieve the current user's session data from the JWT cookie.
- **Logic**:
  1. Reads the `session` cookie.
  2. Verifies the token using `jwtVerify`.
  3. Fetches the `activeSessionId` from the database for the user ID in the token.
  4. **Crucial Security Check**: Compares the `sessionId` from the token with the `activeSessionId` from the database. If they don't match, it means the session has been invalidated (e.g., by a new login on another device), and it returns `null`.
  5. If valid, it returns the user's essential data.
