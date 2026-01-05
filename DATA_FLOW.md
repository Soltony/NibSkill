# Authentication Data Flow

This document outlines the data flow for the key authentication processes in the NIB Training Platform.

---

### 1. User Login Flow

This flow describes how a user's session is initiated.

```
[User's Browser]                           [Server: Next.js API]                         [Database]
      |                                           |                                           |
      |-- 1. POST /api/auth/login ---------------|                                           |
      |   (phoneNumber, password)                 |                                           |
      |                                           |-- 2. Validate credentials (hash check) -->|
      |                                           |<-- 3. Return user data ------------------|
      |                                           |-- 4. Generate Access & Refresh Tokens   |
      |                                           |   (with user's tokenVersion)            |
      |<-- 5. Set HttpOnly cookies --------------|                                           |
      |   (auth_token, refresh_token)             |                                           |
      |                                           |                                           |
```

**Brief:** The user submits their phone number and password. The server verifies these credentials against the database. If correct, it generates two secure, `HttpOnly` cookies: a short-lived access token (15 minutes) and a long-lived refresh token (7 days). These are sent back to the browser to establish the session.

---

### 2. Authenticated API Request Flow

This flow shows how the system verifies a user's identity for protected resources.

```
[User's Browser]                           [Server: Middleware & API]
      |                                           |
      |-- 1. GET /api/some-protected-data -------|
      |   (auth_token cookie is auto-sent)        |
      |                                           |-- 2. Middleware validates auth_token    |
      |                                           |   (signature, expiry, tokenVersion)     |
      |                                           |-- 3. If valid, process request          |
      |<-- 4. Return requested data --------------|
      |                                           |
```

**Brief:** On any request to a protected page or API endpoint, the browser automatically includes the `auth_token` cookie. The server-side middleware intercepts and validates this token (checking its signature, expiration, and `tokenVersion`) before allowing the request to be processed.

---

### 3. Access Token Expiry & Silent Refresh Flow

This flow details the seamless "silent refresh" process when an access token expires.

```
[User's Browser]                           [Server: Next.js API]
      |                                           |
      |-- 1. API request with expired token ----> |
      |<-- 2. Server responds with 401 Error ---- |
      |                                           |
      |-- 3. Client API interceptor catches 401 --|
      |   (POST /api/auth/refresh)                |
      |   (refresh_token cookie is auto-sent)     |
      |                                           |-- 4. Validate refresh_token             |
      |                                           |-- 5. Generate NEW tokens (rotation)     |
      |<-- 6. Set NEW HttpOnly cookies ---------- |
      |                                           |
      |-- 7. Original request is auto-retried --> |
      |<-- 8. Success, return data -------------- |
      |                                           |
```

**Brief:** When the 15-minute access token expires, the next API call fails with a 401 error. A client-side interceptor automatically catches this, uses the long-lived `refresh_token` to request a new set of tokens, and then transparently retries the original request. This happens behind the scenes without interrupting the user.

---

### 4. Secure Logout Flow

This flow explains how a user's session is securely terminated.

```
[User's Browser]                           [Server: Next.js API]                         [Database]
      |                                           |                                           |
      |-- 1. POST /api/auth/logout -------------> |                                           |
      |   (refresh_token cookie is auto-sent)     |                                           |
      |                                           |-- 2. Increment user's tokenVersion ------>| (Invalidates all old tokens)
      |                                           |                                           |
      |<-- 3. Clear auth cookies ---------------- |                                           |
      |                                           |                                           |
```

**Brief:** When the user logs out, the server increments their `tokenVersion` in the database. This action instantly invalidates all access and refresh tokens previously issued for that user, providing a secure, server-side session termination. Finally, it instructs the browser to clear the related authentication cookies.
