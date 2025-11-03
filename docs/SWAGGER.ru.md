# Документация Swagger/OpenAPI

[English version](./SWAGGER.md)

## Обзор

Этот проект использует Swagger/OpenAPI для автоматической документации API с помощью `@fastify/swagger` и `@fastify/swagger-ui`.

## Доступ к документации

### Разработка
Откройте [http://localhost:3000/docs](http://localhost:3000/docs) для просмотра интерактивной документации API.

### Продакшн
Документация будет доступна по адресу `https://yourdomain.com/docs`

## Возможности

- ✅ **Интерактивное тестирование API**: Тестируйте эндпоинты прямо из документации
- ✅ **Интеграция TypeBox**: Типобезопасные схемы с использованием `@sinclair/typebox`
- ✅ **Примеры запросов/ответов**: Автоматическая генерация примеров из схем
- ✅ **Поддержка аутентификации**: Документированная аутентификация через cookies
- ✅ **OpenAPI 3.x**: Современная спецификация OpenAPI

## Конфигурация

Конфигурация Swagger находится в [src/app.ts](../src/app.ts):

```typescript
await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Hoods API',
      description: 'Backend API with Fastify, PostgreSQL, and Drizzle ORM',
      version: '1.0.0'
    },
    servers: [{ url: env.APP_URL }],
    tags: [
      { name: 'auth', description: 'Authentication endpoints' },
      { name: 'health', description: 'Health check endpoints' }
    ],
    components: {
      securitySchemes: {
        cookieAuth: {
          type: 'apiKey',
          in: 'cookie',
          name: 'user_id'
        }
      }
    }
  }
})

await app.register(fastifySwaggerUi, {
  routePrefix: '/docs'
})
```

## Добавление документации к маршрутам

### Базовый пример

```typescript
fastify.get('/health', {
  schema: {
    tags: ['health'],
    description: 'Check API health status',
    response: {
      200: HealthResponseSchema
    }
  }
}, async () => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString()
  }
})
```

### С телом запроса

```typescript
fastify.post('/auth/register', {
  schema: {
    tags: ['auth'],
    description: 'Register a new user',
    body: RegisterBodySchema,
    response: {
      201: SuccessResponseSchema,
      400: ErrorResponseSchema
    }
  }
}, async (request, reply) => {
  // Логика обработчика
})
```

### Защищенные эндпоинты

```typescript
fastify.get('/auth/me', {
  schema: {
    tags: ['auth'],
    description: 'Get current authenticated user',
    response: {
      200: UserResponseSchema,
      401: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]  // Указывает на необходимость аутентификации
  },
  preHandler: requireAuth
}, async (request, reply) => {
  // Логика обработчика
})
```

## Создание схем

Схемы определяются в [src/schemas/](../src/schemas/) с использованием TypeBox:

```typescript
import { Type } from '@sinclair/typebox'

export const UserResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'User ID' }),
  email: Type.String({ format: 'email', description: 'User email' }),
  name: Type.Optional(Type.String({ description: 'User name' }))
}, {
  $id: 'UserResponse',
  description: 'User data response'
})
```

### Свойства схем

- **$id**: Уникальный идентификатор схемы (переиспользуемый в разных маршрутах)
- **description**: Описание на уровне схемы
- **format**: Формат данных (uuid, email, date-time и т.д.)
- **Type.Optional**: Помечает поле как опциональное

## Доступные схемы

Находятся в [src/schemas/auth.schema.ts](../src/schemas/auth.schema.ts):

| Схема | Описание |
|-------|----------|
| `RegisterBodySchema` | Запрос регистрации пользователя |
| `UserResponseSchema` | Ответ с данными пользователя |
| `SuccessResponseSchema` | Успешная операция с данными пользователя |
| `ErrorResponseSchema` | Ответ с ошибкой |
| `MessageResponseSchema` | Ответ с сообщением об успехе |
| `HealthResponseSchema` | Ответ проверки здоровья |

## Коды статусов ответов

Документируйте все возможные ответы для каждого эндпоинта:

```typescript
schema: {
  response: {
    200: SuccessResponseSchema,     // Успех
    400: ErrorResponseSchema,        // Неверный запрос / Ошибка валидации
    401: ErrorResponseSchema,        // Не авторизован
    404: ErrorResponseSchema,        // Не найдено
    409: ErrorResponseSchema,        // Конфликт (например, дублирующийся email)
    500: ErrorResponseSchema         // Ошибка сервера
  }
}
```

## TypeBox vs Zod

Этот проект использует **TypeBox** вместо Zod по нескольким причинам:

| Функция | TypeBox | Zod |
|---------|---------|-----|
| **JSON Schema** | ✅ Нативно | ⚠️ Требует конвертации |
| **Интеграция Swagger** | ✅ Бесшовная | ⚠️ Нужны дополнительные плагины |
| **Производительность** | ✅ Быстрее | Медленнее |
| **Размер бандла** | ✅ Меньше | Больше |
| **Поддержка Fastify** | ✅ Официальный плагин | Ручная настройка |

### Сравнение примеров

**TypeBox:**
```typescript
const UserSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  name: Type.Optional(Type.String())
})
```

**Zod:**
```typescript
const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().optional()
})
```

TypeBox интегрируется напрямую с системой схем Fastify, в то время как Zod требует дополнительных слоев трансформации.

## Добавление новых эндпоинтов

### 1. Создайте схему (при необходимости)

```typescript
// src/schemas/post.schema.ts
export const CreatePostSchema = Type.Object({
  title: Type.String({ minLength: 1, maxLength: 255 }),
  content: Type.String()
}, {
  $id: 'CreatePost',
  description: 'Create post request'
})
```

### 2. Добавьте маршрут со схемой

```typescript
// src/routes/post.routes.ts
fastify.post('/posts', {
  schema: {
    tags: ['posts'],
    description: 'Create a new post',
    body: CreatePostSchema,
    response: {
      201: PostResponseSchema,
      400: ErrorResponseSchema,
      401: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]
  },
  preHandler: requireAuth
}, async (request, reply) => {
  const body = request.body as { title: string; content: string }
  // Логика создания поста
})
```

### 3. Обновите теги (при необходимости)

Добавьте новый тег в [src/app.ts](../src/app.ts):

```typescript
tags: [
  { name: 'auth', description: 'Authentication endpoints' },
  { name: 'posts', description: 'Post management' },  // Новый тег
  { name: 'health', description: 'Health check endpoints' }
]
```

## Расширенные возможности

### Пользовательские примеры ответов

```typescript
const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String({ examples: ['user@example.com'] })
}, {
  examples: [{
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'john@example.com'
  }]
})
```

### Параметры запроса

```typescript
fastify.get('/users', {
  schema: {
    querystring: Type.Object({
      limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
      offset: Type.Optional(Type.Integer({ minimum: 0 }))
    }),
    response: {
      200: Type.Array(UserResponseSchema)
    }
  }
}, async (request) => {
  const { limit = 10, offset = 0 } = request.query
  // Логика обработчика
})
```

### Параметры пути

```typescript
fastify.get('/users/:id', {
  schema: {
    params: Type.Object({
      id: Type.String({ format: 'uuid' })
    }),
    response: {
      200: UserResponseSchema,
      404: ErrorResponseSchema
    }
  }
}, async (request, reply) => {
  const { id } = request.params
  // Логика обработчика
})
```

## Экспорт спецификации OpenAPI

Для экспорта спецификации OpenAPI в формате JSON:

```typescript
// После запуска приложения
await app.ready()
const spec = app.swagger()
console.log(JSON.stringify(spec, null, 2))
```

Или добавьте эндпоинт для получения спецификации:

```typescript
app.get('/api/openapi.json', async () => {
  return app.swagger()
})
```

## Лучшие практики

### 1. Используйте $id для переиспользуемых схем
```typescript
const UserSchema = Type.Object({ ... }, { $id: 'User' })
// Может быть использовано в нескольких эндпоинтах
```

### 2. Документируйте все ответы
```typescript
response: {
  200: SuccessSchema,
  400: ErrorSchema,  // Не забывайте про случаи ошибок
  401: ErrorSchema,
  500: ErrorSchema
}
```

### 3. Добавляйте описания
```typescript
Type.String({ description: 'User email address', format: 'email' })
```

### 4. Используйте правильные коды статусов HTTP
- `200` - Успех (GET, PUT)
- `201` - Создано (POST)
- `204` - Нет содержимого (DELETE)
- `400` - Неверный запрос
- `401` - Не авторизован
- `404` - Не найдено
- `409` - Конфликт
- `500` - Ошибка сервера

### 5. Группируйте связанные эндпоинты с помощью тегов
```typescript
schema: {
  tags: ['auth'],  // Группирует все эндпоинты аутентификации вместе
  // ...
}
```

## Устранение проблем

### Схемы не отображаются

1. Проверьте, что `$id` уникален
2. Убедитесь, что схема используется хотя бы в одном маршруте
3. Проверьте совместимость версии TypeBox

### Валидация типов не работает

Убедитесь, что вы используете `.withTypeProvider<TypeBoxTypeProvider>()`:

```typescript
const app = fastify().withTypeProvider<TypeBoxTypeProvider>()
```

### Документация не обновляется

1. Перезапустите сервер
2. Очистите кеш браузера
3. Проверьте наличие ошибок компиляции TypeScript

## Справочные материалы

- [Документация @fastify/swagger](https://github.com/fastify/fastify-swagger)
- [Документация @fastify/swagger-ui](https://github.com/fastify/fastify-swagger-ui)
- [Документация TypeBox](https://github.com/sinclairzx81/typebox)
- [Спецификация OpenAPI](https://swagger.io/specification/)

## Резюме

- ✅ Интерактивная документация API на `/docs`
- ✅ TypeBox для типобезопасных схем
- ✅ Автоматическая валидация запросов/ответов
- ✅ Спецификация OpenAPI 3.x
- ✅ Поддержка аутентификации через cookies
- ✅ Расширяемая и поддерживаемая
