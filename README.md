
# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Security & Session Changes ✅

- Idle session timeout default reduced to 15 minutes (env: `IDLE_TIMEOUT_SECONDS`, default 900 seconds)
- Maximum session age default reduced to 7 days (env: `MAX_SESSION_AGE_SECONDS`, default 604800 seconds)
- Re-authentication window default: 5 minutes (env: `REAUTH_TIMEOUT_SECONDS`, default 300 seconds). Sensitive actions (email/phone changes, payments) require a recent re-auth.
- Refresh token cookie persistence (cleared on browser close by default): set `REFRESH_TOKENS_PERSISTENT=true` to make refresh cookies persistent across restarts. Default: `false`.

Add or adjust these environment variables as needed to tune policy for your deployment.

Security recommendations (suitable for higher-risk / banking scenarios):

- IDLE_TIMEOUT_SECONDS: consider 5-15 minutes (300-900s) depending on risk profile; default: 900 (15m)
- MAX_SESSION_AGE_SECONDS: consider 24 hours (86400s) for high-risk apps, or lower; default: 604800 (7d)
- REAUTH_TIMEOUT_SECONDS: require fresh re-auth for sensitive actions, default: 300 (5m)
- REFRESH_TOKENS_PERSISTENT: set to `false` to clear refresh tokens on browser close; set `true` only when long-lived cross-device sessions are required

⚠️ Database migration: after pulling these changes run:

  npx prisma migrate dev --name add-session-reauthenticatedAt

This will add the new `reauthenticatedAt` field to the `Session` model.

Operational notes:
- The server enforces inactivity and absolute session age and will revoke refresh tokens and mark sessions revoked when limits are exceeded.
- Middleware (edge) performs only best-effort checks and cannot replace server-side inactivity enforcement.
- Middleware client body size limiting: set `MIDDLEWARE_CLIENT_MAX_BODY_SIZE` (default `50mb`) if your middleware must access large request bodies (the default middleware limit is 10MB and will cause parse errors if exceeded). Increase only when necessary and avoid unbounded values in production.
- Consider adding regular background cleanup of expired/revoked sessions and refresh tokens to keep the database tidy.
- For formal regulatory compliance, document policies and test rotation/expiry in your security and QA runbooks.
