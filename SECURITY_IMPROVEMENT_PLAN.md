# План улучшения безопасности сессий

## Текущие проблемы

### 🔴 Критические уязвимости

1. **Session Hijacking** - user_id передается в открытом виде
2. **Отсутствие инвалидации** - logout не отзывает сессии на сервере
3. **Session Fixation** - нет ротации session ID
4. **Отсутствие метаданных** - нет проверки IP, User-Agent, device fingerprint
5. **Неограниченные сессии** - один пользователь может иметь бесконечно много активных сессий
6. **Предсказуемость** - UUID могут быть предсказуемыми

## Решение: JWT + Session Store

### Вариант 1: JWT в HttpOnly Cookie (Рекомендуется)

#### Преимущества
- ✅ Защита от XSS (токен недоступен JavaScript)
- ✅ Криптографическая подпись (невозможно подделать)
- ✅ Встроенная проверка целостности
- ✅ Возможность хранить метаданные (IP, User-Agent, issued_at)
- ✅ Возможность инвалидации через blacklist или session store

#### Структура JWT Payload
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "role": "buyer",
  "iat": 1642441200,
  "exp": 1642527600,
  "jti": "unique_token_id",
  "iss": "hoods-api",
  "device_id": "fingerprint_hash"
}
```

#### Архитектура

```
Login Flow:
┌──────┐                  ┌─────────┐                ┌──────────┐
│Client│                  │ Backend │                │PostgreSQL│
└──┬───┘                  └────┬────┘                └────┬─────┘
   │                           │                          │
   │  POST /auth/login         │                          │
   ├──────────────────────────►│                          │
   │  {email, password}        │                          │
   │                           │   Verify credentials     │
   │                           ├─────────────────────────►│
   │                           │                          │
   │                           │◄─────────────────────────┤
   │                           │   User data              │
   │                           │                          │
   │                           │  Generate JWT            │
   │                           │  Sign with secret        │
   │                           │                          │
   │                           │  Store session metadata  │
   │                           │  in Redis/DB             │
   │                           │  {jti, userId, IP,       │
   │                           │   userAgent, expiresAt}  │
   │                           │                          │
   │  Set-Cookie: token=JWT    │                          │
   │◄──────────────────────────┤                          │
   │  HttpOnly, Secure,        │                          │
   │  SameSite=strict          │                          │
   │                           │                          │

Request Flow:
┌──────┐                  ┌─────────┐                ┌──────────┐
│Client│                  │ Backend │                │  Redis   │
└──┬───┘                  └────┬────┘                └────┬─────┘
   │                           │                          │
   │  GET /v1/feed             │                          │
   │  Cookie: token=JWT        │                          │
   ├──────────────────────────►│                          │
   │                           │  1. Verify JWT signature │
   │                           │  2. Check expiration     │
   │                           │  3. Extract jti          │
   │                           │                          │
   │                           │  Check if jti blacklisted│
   │                           ├─────────────────────────►│
   │                           │                          │
   │                           │◄─────────────────────────┤
   │                           │  Session valid           │
   │                           │                          │
   │                           │  4. Verify IP/UserAgent  │
   │                           │  5. Check user isActive  │
   │                           │                          │
   │  Response with data       │                          │
   │◄──────────────────────────┤                          │
   │                           │                          │

Logout Flow:
┌──────┐                  ┌─────────┐                ┌──────────┐
│Client│                  │ Backend │                │  Redis   │
└──┬───┘                  └────┬────┘                └────┬─────┘
   │                           │                          │
   │  POST /auth/logout        │                          │
   ├──────────────────────────►│                          │
   │  Cookie: token=JWT        │                          │
   │                           │  Extract jti from JWT    │
   │                           │                          │
   │                           │  Add jti to blacklist    │
   │                           ├─────────────────────────►│
   │                           │  TTL = token expiration  │
   │                           │                          │
   │  Clear-Cookie: token      │                          │
   │◄──────────────────────────┤                          │
   │                           │                          │
```

### Вариант 2: JWT в Authorization Header

#### Преимущества
- ✅ Более RESTful подход
- ✅ Легче для мобильных приложений
- ✅ Нет проблем с CORS

#### Недостатки
- ❌ Нужно хранить токен в localStorage (уязвимость к XSS)
- ❌ Дополнительная логика на фронтенде для refresh токенов

## Пошаговый план внедрения

### Этап 1: Установка зависимостей
```bash
npm install @fastify/jwt
npm install ioredis
npm install @types/ioredis --save-dev
```

### Этап 2: Создание Session Store

**Файл: `src/services/session.service.ts`**

Функционал:
- Создание сессии с метаданными
- Проверка валидности сессии
- Инвалидация сессии (logout)
- Инвалидация всех сессий пользователя
- Получение списка активных сессий
- Автоматическая очистка истекших сессий

### Этап 3: Настройка JWT

**Файл: `src/config/jwt.config.ts`**

Параметры:
- SECRET из env переменных
- Время жизни access token: 15 минут
- Время жизни refresh token: 7 дней
- Алгоритм: HS256 (или RS256 для production)

### Этап 4: Миграция схемы БД

**Файл: `src/db/schemas/sessions.schema.ts`**

Таблица sessions:
```typescript
{
  id: uuid
  userId: uuid (FK to users)
  jti: string (unique token ID)
  deviceId: string (fingerprint)
  ipAddress: string
  userAgent: string
  issuedAt: timestamp
  expiresAt: timestamp
  lastActivityAt: timestamp
  isRevoked: boolean
  createdAt: timestamp
}
```

### Этап 5: Обновление Auth Service

**Изменения:**
- `register()` - генерация JWT вместо простого user_id
- `login()` - создание сессии + JWT
- `logout()` - инвалидация токена в blacklist
- `logoutAll()` - отзыв всех токенов пользователя
- `refreshToken()` - обновление access token через refresh token

### Этап 6: Обновление Auth Middleware

**Файл: `src/middlewares/auth.middleware.ts`**

Проверки:
1. Извлечение JWT из cookie
2. Проверка подписи
3. Проверка срока действия
4. Проверка jti в blacklist (Redis)
5. Проверка соответствия IP/User-Agent (опционально, для strict mode)
6. Проверка isActive пользователя
7. Обновление lastActivityAt

### Этап 7: Новые endpoints

```typescript
// Обновление токена
POST /v1/auth/refresh
Body: { refreshToken }
Response: { accessToken, refreshToken }

// Получить активные сессии
GET /v1/auth/sessions
Response: [{ id, device, ip, lastActivity, current }]

// Отозвать конкретную сессию
DELETE /v1/auth/sessions/:sessionId

// Отозвать все сессии кроме текущей
POST /v1/auth/logout-all
```

### Этап 8: Конфигурация Redis

**Файл: `src/config/redis.ts`**

Использование:
- Blacklist для отозванных JWT (key: `blacklist:${jti}`, TTL: token expiration)
- Кэш активных сессий (key: `session:${userId}:${jti}`)
- Rate limiting (уже настроено)

### Этап 9: Environment Variables

**Добавить в `.env.development` и `.env.production`:**
```env
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-in-production-min-32-chars
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

### Этап 10: Миграция существующих пользователей

**Стратегия:**
1. Существующие cookie-based сессии остаются валидными
2. При следующем login пользователь получает JWT
3. Старые cookie постепенно истекают (7 дней)
4. Middleware поддерживает оба типа токенов временно
5. Через 14 дней - полное удаление cookie-based аутентификации

## Сравнение: До и После

### ДО (текущая реализация)

```typescript
// Login
reply.setCookie('user_id', user.id, {
  httpOnly: true,
  maxAge: 7 * 24 * 60 * 60
})

// Auth check
const userId = request.cookies.user_id
const user = await userRepository.findById(userId)

// Logout
reply.clearCookie('user_id')
```

**Проблемы:**
- ❌ user_id в открытом виде
- ❌ Нет инвалидации на сервере
- ❌ Нет метаданных
- ❌ Нет ротации токенов

### ПОСЛЕ (JWT + Session Store)

```typescript
// Login
const accessToken = jwt.sign({
  sub: user.id,
  email: user.email,
  role: user.role,
  jti: randomUUID()
}, { expiresIn: '15m' })

await sessionService.createSession({
  userId: user.id,
  jti: tokenPayload.jti,
  deviceId: deviceFingerprint,
  ipAddress: request.ip,
  userAgent: request.headers['user-agent']
})

reply.setCookie('access_token', accessToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 15 * 60
})

// Auth check
const token = request.cookies.access_token
const payload = await jwt.verify(token)

// Check if blacklisted
const isRevoked = await redis.exists(`blacklist:${payload.jti}`)
if (isRevoked) throw new Error('Token revoked')

// Verify IP (optional)
const session = await sessionService.getSession(payload.jti)
if (session.ipAddress !== request.ip) {
  throw new Error('IP mismatch')
}

// Logout
await redis.setex(
  `blacklist:${tokenPayload.jti}`,
  tokenPayload.exp - Date.now() / 1000,
  '1'
)
reply.clearCookie('access_token')
```

**Преимущества:**
- ✅ Криптографическая защита
- ✅ Полная инвалидация на сервере
- ✅ Метаданные и аудит
- ✅ Ротация через refresh tokens
- ✅ Контроль параллельных сессий
- ✅ Защита от Session Fixation
- ✅ IP/Device verification

## Метрики безопасности

### Текущая система
- **OWASP Score:** 3/10
- **Session Hijacking:** Высокий риск
- **Session Fixation:** Высокий риск
- **Credential Theft Impact:** Критический (постоянный доступ)
- **Audit Trail:** Отсутствует

### Предлагаемая система
- **OWASP Score:** 9/10
- **Session Hijacking:** Низкий риск
- **Session Fixation:** Риск устранен
- **Credential Theft Impact:** Минимальный (15 минут + отзыв)
- **Audit Trail:** Полный (все сессии, IP, устройства)

## Дополнительные улучшения

### 1. Device Fingerprinting
```typescript
import FingerprintJS from '@fingerprintjs/fingerprintjs'

const deviceId = createHash('sha256')
  .update(userAgent + acceptLanguage + screenResolution)
  .digest('hex')
```

### 2. Suspicious Activity Detection
```typescript
// Detect login from new location
if (distance(lastIpLocation, currentIpLocation) > 1000km) {
  sendEmailNotification('New login from unusual location')
  requireTwoFactorAuth()
}
```

### 3. Progressive Token Expiration
```typescript
// Shorter tokens for sensitive operations
if (route === '/auth/admin/users') {
  maxAge = 5 * 60 // 5 minutes for admin operations
}
```

### 4. Token Rotation on Privilege Escalation
```typescript
// After role change, force re-authentication
if (user.role !== tokenPayload.role) {
  throw new Error('Role changed, please re-login')
}
```

## Время внедрения

- **Этап 1-3:** 2-3 часа (установка, конфиг, session service)
- **Этап 4-6:** 3-4 часа (миграция БД, auth service, middleware)
- **Этап 7-8:** 2-3 часа (новые endpoints, Redis)
- **Этап 9-10:** 1-2 часа (env, миграция пользователей)

**Общее время:** 8-12 часов разработки + тестирование

## Тестирование

### Unit Tests
- JWT generation и validation
- Session creation и invalidation
- Blacklist functionality

### Integration Tests
- Login/Logout flow
- Token refresh
- Multiple concurrent sessions
- IP verification
- Device fingerprinting

### Security Tests
- Попытка подделки JWT
- Попытка использования отозванного токена
- Session Fixation attack
- Token replay attack
- CSRF protection

## Заключение

Текущая реализация с простым `user_id` в cookie **критически небезопасна** для production. JWT + Session Store обеспечивает:

1. ✅ Криптографическую защиту
2. ✅ Полный контроль над сессиями
3. ✅ Аудит и мониторинг
4. ✅ Защиту от основных атак
5. ✅ Соответствие best practices

**Рекомендация:** Внедрить как можно скорее, ДО выхода в production.