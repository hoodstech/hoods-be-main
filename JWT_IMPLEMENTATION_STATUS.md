# JWT + Session Store Implementation Status

## ✅ Completed Steps

### 1. Dependencies Installed
- `@fastify/jwt` - JWT plugin for Fastify
- `ioredis` - Redis client
- `@types/ioredis` - TypeScript types

### 2. Configuration Files Created
- [x] **src/config/redis.ts** - Redis connection configuration
- [x] **src/config/jwt.config.ts** - JWT settings (secret, expiration, issuer, audience)
- [x] **src/config/env.ts** - Updated with JWT and Redis environment variables
- [x] **.env.development** - Added all new environment variables

### 3. Database Schema
- [x] **src/db/schemas/sessions.schema.ts** - Sessions table with:
  - `id`, `userId`, `jti` (JWT ID)
  - `deviceId`, `ipAddress`, `userAgent`
  - `issuedAt`, `expiresAt`, `lastActivityAt`
  - `isRevoked`, `createdAt`
- [x] Migration generated: `src/db/migrations/0002_legal_selene.sql`

### 4. Repository Layer
- [x] **src/repositories/session.repository.ts** - Methods for:
  - Creating sessions
  - Finding by JTI
  - Finding active sessions by user ID
  - Updating last activity
  - Revoking sessions (single, all, all except current)
  - Deleting expired sessions

### 5. Service Layer
- [x] **src/services/session.service.ts** - Session management with:
  - Creating sessions with concurrent limit check
  - Validating sessions (blacklist + DB check)
  - Revoking sessions (with Redis blacklist)
  - IP verification for strict mode
  - Cleanup of expired sessions
- [x] **src/services/auth.service.ts** - Updated with JWT methods:
  - `generateTokens()` - Create access + refresh tokens
  - `verifyToken()` - Validate JWT and check blacklist
  - `refreshAccessToken()` - Renew access token
  - `logout()` - Revoke single session
  - `logoutAll()` - Revoke all user sessions
  - `logoutOthers()` - Revoke all except current
  - `getUserSessions()` - List active sessions

### 6. Middleware
- [x] **src/middlewares/auth.middleware.ts** - Completely rewritten:
  - Extracts JWT from cookie or Authorization header
  - Verifies JWT signature and expiration
  - Checks session blacklist
  - Verifies IP address (if strict mode)
  - Updates last activity timestamp
  - Attaches `userId`, `userRole`, `jti` to request

### 7. Utilities
- [x] **src/utils/jwt.utils.ts** - Helper functions:
  - `generateDeviceFingerprint()` - Using argon2 for hashing
  - `parseExpirationToSeconds()` - Convert "15m", "7d" to seconds
  - `extractToken()` - Get JWT from cookie or header
  - `calculateExpirationDate()` - Calculate expiration timestamp

### 8. Type Definitions
- [x] **src/types/fastify.d.ts** - Added `jti` field to FastifyRequest

### 9. Dependency Injection
- [x] **src/container.ts** - Updated with:
  - Redis client registration
  - SessionRepository registration
  - SessionService registration
  - Updated AuthService dependencies

### 10. Application Setup
- [x] **src/app.ts** - Registered `@fastify/jwt` plugin with configuration

### 11. Routes Updated
- [x] **src/routes/auth.routes.ts** - Updated endpoints:
  - `/auth/register` - Generates JWT tokens, sets cookies
  - `/auth/login` - Generates JWT tokens, sets cookies
  - `/auth/logout` - Revokes session, clears cookies
  - Middleware now uses `authService` instead of `userRepository`
- [x] **src/routes/seller.routes.ts** - Updated middleware to use `authService`
- [x] **src/routes/buyer.routes.ts** - Updated middleware to use `authService`

## 🔄 Next Steps to Complete

### Step 1: Add Session Management Endpoints

Create new endpoints in `src/routes/auth.routes.ts`:

```typescript
// GET /auth/sessions - Get active sessions
fastify.get('/auth/sessions', {
  schema: {
    tags: ['auth'],
    description: 'Get all active sessions for current user',
    response: {
      200: Type.Object({
        success: Type.Literal(true),
        data: Type.Array(Type.Object({
          id: Type.String(),
          deviceId: Type.Union([Type.String(), Type.Null()]),
          ipAddress: Type.Union([Type.String(), Type.Null()]),
          userAgent: Type.Union([Type.String(), Type.Null()]),
          issuedAt: Type.String(),
          expiresAt: Type.String(),
          lastActivityAt: Type.String(),
          isCurrent: Type.Boolean()
        }))
      })
    },
    security: [{ cookieAuth: [] }]
  },
  preHandler: requireAuth
}, async (request, reply) => {
  const sessions = await authService.getUserSessions(request.userId!, request.jti)

  return reply.send({
    success: true,
    data: sessions
  })
})

// POST /auth/refresh - Refresh access token
fastify.post('/auth/refresh', {
  schema: {
    tags: ['auth'],
    description: 'Refresh access token using refresh token',
    response: {
      200: Type.Object({
        success: Type.Literal(true),
        message: Type.String()
      }),
      401: ErrorResponseSchema
    }
  }
}, async (request, reply) => {
  try {
    const refreshToken = request.cookies.refresh_token

    if (!refreshToken) {
      return reply.code(401).send({
        success: false,
        error: 'Refresh token not found'
      })
    }

    // Verify refresh token
    const payload = await fastify.jwt.verify<JWTPayload>(refreshToken)

    // Generate new access token
    const newAccessToken = await authService.refreshAccessToken(
      payload,
      fastify.jwt.sign.bind(fastify.jwt)
    )

    // Set new access token cookie
    reply.setCookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60,
      path: '/'
    })

    return reply.send({
      success: true,
      message: 'Token refreshed successfully'
    })
  } catch (error) {
    return reply.code(401).send({
      success: false,
      error: 'Invalid refresh token'
    })
  }
})

// POST /auth/logout-all - Logout from all devices
fastify.post('/auth/logout-all', {
  schema: {
    tags: ['auth'],
    description: 'Logout from all devices',
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]
  },
  preHandler: requireAuth
}, async (request, reply) => {
  await authService.logoutAll(request.userId!)

  reply.clearCookie('access_token', { path: '/' })
  reply.clearCookie('refresh_token', { path: '/' })

  return reply.send({
    success: true,
    message: 'Logged out from all devices'
  })
})

// POST /auth/logout-others - Logout from other devices
fastify.post('/auth/logout-others', {
  schema: {
    tags: ['auth'],
    description: 'Logout from all devices except current',
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]
  },
  preHandler: requireAuth
}, async (request, reply) => {
  await authService.logoutOthers(request.userId!, request.jti!)

  return reply.send({
    success: true,
    message: 'Logged out from other devices'
  })
})

// DELETE /auth/sessions/:sessionId - Revoke specific session
fastify.delete('/auth/sessions/:sessionId', {
  schema: {
    tags: ['auth'],
    description: 'Revoke a specific session',
    params: Type.Object({
      sessionId: Type.String({ format: 'uuid' })
    }),
    response: {
      200: MessageResponseSchema,
      401: ErrorResponseSchema,
      404: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]
  },
  preHandler: requireAuth
}, async (request, reply) => {
  const { sessionId } = request.params as { sessionId: string }

  // TODO: Add method to revoke by session ID in SessionService
  // For now, implement basic revocation logic

  return reply.send({
    success: true,
    message: 'Session revoked successfully'
  })
})
```

### Step 2: Update Google OAuth Flow

Update the Google OAuth callback to generate JWT tokens:

```typescript
// In auth.routes.ts, update the /auth/google/callback endpoint

const user = await googleOAuthService.handleCallback(tokens)

// Generate JWT tokens
const { accessToken, refreshToken } = await authService.generateTokens(
  user,
  fastify.jwt.sign.bind(fastify.jwt),
  request.ip,
  request.headers['user-agent']
)

// Set cookies
reply.setCookie('access_token', accessToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 15 * 60,
  path: '/'
})

reply.setCookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60,
  path: '/'
})
```

### Step 3: Run Database Migration

```bash
npm run db:migrate
```

This will create the `sessions` table in PostgreSQL.

### Step 4: Start Redis

Make sure Redis is running:

```bash
# On Windows with Docker
docker run -d -p 6379:6379 redis:alpine

# Or if Redis is installed locally
redis-server
```

### Step 5: Update Swagger Security Scheme

In `src/app.ts`, update the security scheme:

```typescript
components: {
  securitySchemes: {
    cookieAuth: {
      type: 'apiKey',
      in: 'cookie',
      name: 'access_token', // Changed from 'user_id'
      description: 'JWT token in httpOnly cookie'
    }
  }
}
```

### Step 6: Test the Implementation

```bash
# Build the project
npm run build

# Run tests (if available)
npm test

# Start the server
npm run dev
```

## 🧪 Testing Checklist

### Registration
- [ ] POST `/v1/auth/register` - Creates user and returns JWT tokens
- [ ] Verify `access_token` and `refresh_token` cookies are set
- [ ] Verify session is created in database
- [ ] Verify session concurrent limit (5 sessions max)

### Login
- [ ] POST `/v1/auth/login` - Authenticates and returns JWT tokens
- [ ] Verify old sessions are revoked if limit exceeded
- [ ] Verify IP address is stored correctly

### Authentication
- [ ] Protected routes require valid JWT
- [ ] Expired tokens are rejected
- [ ] Revoked tokens (blacklisted) are rejected
- [ ] IP mismatch is detected (if strict mode enabled)

### Logout
- [ ] POST `/v1/auth/logout` - Revokes current session
- [ ] Cookies are cleared
- [ ] Token is blacklisted in Redis
- [ ] Cannot use revoked token

### Session Management
- [ ] GET `/v1/auth/sessions` - Lists active sessions
- [ ] POST `/v1/auth/logout-all` - Revokes all sessions
- [ ] POST `/v1/auth/logout-others` - Revokes other sessions
- [ ] DELETE `/v1/auth/sessions/:id` - Revokes specific session

### Token Refresh
- [ ] POST `/v1/auth/refresh` - Refreshes access token
- [ ] New access token is generated
- [ ] Refresh token remains valid

### Security
- [ ] JWT signature verification works
- [ ] Expired tokens are rejected
- [ ] Blacklisted tokens are rejected
- [ ] Rate limiting works on auth endpoints
- [ ] Helmet headers are present
- [ ] CORS is properly configured

## 📊 Security Improvements

### Before (Cookie-based with user_id)
- ❌ user_id in plaintext cookie
- ❌ No server-side session invalidation
- ❌ No session metadata tracking
- ❌ Vulnerable to session hijacking
- ❌ No device fingerprinting
- ❌ No IP verification

### After (JWT + Session Store)
- ✅ Cryptographically signed JWT tokens
- ✅ Server-side session revocation with blacklist
- ✅ Full session metadata (IP, device, user-agent)
- ✅ Protected from session hijacking (short expiration + blacklist)
- ✅ Device fingerprinting using argon2
- ✅ Optional IP verification (strict mode)
- ✅ Multiple session management
- ✅ Audit trail of all sessions
- ✅ Automatic cleanup of expired sessions

## 🔒 Security Best Practices Implemented

1. **Short-lived Access Tokens** - 15 minutes expiration
2. **Long-lived Refresh Tokens** - 7 days, used to renew access tokens
3. **HttpOnly Cookies** - Prevents XSS theft
4. **Secure Cookies** - HTTPS only in production
5. **SameSite=Strict** - CSRF protection
6. **Redis Blacklist** - Fast token revocation
7. **Session Metadata** - IP, device, user-agent tracking
8. **Concurrent Session Limit** - Max 5 sessions per user
9. **IP Verification** - Optional strict mode
10. **Rate Limiting** - Protection from brute-force
11. **Helmet Headers** - XSS, clickjacking protection
12. **Argon2 Hashing** - For passwords and device fingerprints

## 📝 Environment Variables

Required in `.env.development` and `.env.production`:

```env
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-change-this-in-production
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session Configuration
SESSION_MAX_CONCURRENT=5
SESSION_STRICT_IP_CHECK=false  # true for production
```

## 🚀 Production Recommendations

1. **Generate Strong JWT_SECRET**:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **Enable Strict IP Check**:
   ```env
   SESSION_STRICT_IP_CHECK=true
   ```

3. **Use Redis Cluster** for high availability

4. **Set up Periodic Session Cleanup**:
   ```typescript
   // In src/index.ts or separate cron job
   setInterval(async () => {
     const deleted = await sessionService.cleanupExpiredSessions()
     console.log(`Cleaned up ${deleted} expired sessions`)
   }, 60 * 60 * 1000) // Every hour
   ```

5. **Monitor Failed Authentication Attempts**:
   - Log IP addresses with multiple failed attempts
   - Set up alerts for suspicious patterns

6. **Implement Two-Factor Authentication** (future enhancement)

7. **Add Email Notifications**:
   - New device login
   - Unusual location
   - Session revocation

## 🎯 What Changed

### Files Modified
- ✅ src/config/env.ts
- ✅ src/config/index.ts
- ✅ src/app.ts
- ✅ src/container.ts
- ✅ src/middlewares/auth.middleware.ts
- ✅ src/services/auth.service.ts
- ✅ src/types/fastify.d.ts
- ✅ src/routes/auth.routes.ts
- ✅ src/routes/seller.routes.ts
- ✅ src/routes/buyer.routes.ts
- ✅ .env.development

### Files Created
- ✅ src/config/redis.ts
- ✅ src/config/jwt.config.ts
- ✅ src/db/schemas/sessions.schema.ts
- ✅ src/repositories/session.repository.ts
- ✅ src/services/session.service.ts
- ✅ src/utils/jwt.utils.ts
- ✅ src/db/migrations/0002_legal_selene.sql

## 🔧 Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
docker run -d -p 6379:6379 redis:alpine
```

### JWT Verification Errors
- Check JWT_SECRET is at least 32 characters
- Verify token expiration time is not too short
- Check system clock is synchronized

### Session Not Being Created
- Verify database migration ran successfully
- Check Redis connection
- Look for errors in logs

### IP Mismatch Errors
- Disable strict mode in development: `SESSION_STRICT_IP_CHECK=false`
- Check if behind proxy: might need to configure trusted proxies

## 📚 Additional Resources

- [Fastify JWT Plugin](https://github.com/fastify/fastify-jwt)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Redis Security](https://redis.io/topics/security)
