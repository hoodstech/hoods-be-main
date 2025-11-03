# Руководство по конфигурации TypeScript

[English version](./TYPESCRIPT.md)

## Объявления типов

Все расширения модулей Fastify централизованы в одном месте, чтобы избежать дублирования и поддерживать согласованность.

### Расположение

[src/types/fastify.d.ts](../src/types/fastify.d.ts)

Этот файл содержит все расширения типов для фреймворка Fastify:

```typescript
import 'fastify'

declare module 'fastify' {
  // Расширения запроса
  interface FastifyRequest {
    userId?: string  // Добавлено middleware аутентификации
  }

  // Расширения экземпляра
  interface FastifyInstance {
    googleOAuth2: {
      // Методы плагина OAuth2
    }
  }
}
```

## Зачем централизовать объявления типов?

### До (Проблема)

Несколько файлов содержали дублирующиеся выражения `declare module`:

```typescript
// ❌ src/app.ts
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: { ... }
  }
}

// ❌ src/middlewares/auth.middleware.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }
}
```

**Проблемы:**
- Дублирование приводит к избыточности при обслуживании
- Сложно отследить все расширения типов
- Возможны конфликтующие объявления
- Нарушение принципа DRY

### После (Решение)

Единый источник истины:

```typescript
// ✅ src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
  }

  interface FastifyInstance {
    googleOAuth2: { ... }
  }
}
```

**Преимущества:**
- Единое место для всех расширений типов Fastify
- Легко найти и поддерживать
- Нет дублирования
- Четкая документация пользовательских свойств
- Автоматическое обнаружение TypeScript

## Как это работает

### Автоматическое обнаружение

TypeScript автоматически обнаруживает файлы `.d.ts` в вашем проекте на основе `tsconfig.json`:

```json
{
  "include": ["src/**/*"]
}
```

Все файлы `.d.ts` в `src/` включаются автоматически.

### Расширение модуля

Синтаксис `declare module 'fastify'` использует функцию TypeScript **module augmentation** для расширения существующих интерфейсов:

```typescript
import 'fastify'  // Импортируем модуль для расширения

declare module 'fastify' {
  // Расширяем существующие интерфейсы
  interface FastifyRequest {
    customProperty: string
  }
}
```

## Добавление новых расширений типов

Когда вам нужно расширить типы Fastify:

### 1. Определите, что вы расширяете

- `FastifyRequest` - Расширения объекта запроса
- `FastifyReply` - Расширения объекта ответа
- `FastifyInstance` - Расширения экземпляра приложения
- `RouteGenericInterface` - Типы для конкретных маршрутов

### 2. Добавьте в fastify.d.ts

```typescript
// src/types/fastify.d.ts
import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string        // Существующее
    sessionId?: string     // ✅ Новое добавление
  }

  interface FastifyInstance {
    googleOAuth2: { ... }  // Существующее
    customPlugin: { ... }  // ✅ Новый плагин
  }
}
```

### 3. Импорт не требуется

Типы доступны глобально после объявления. Просто используйте их:

```typescript
// Любой файл в вашем проекте
import type { FastifyRequest } from 'fastify'

function handler(request: FastifyRequest) {
  const userId = request.userId      // ✅ Типобезопасно
  const sessionId = request.sessionId // ✅ Типобезопасно
}
```

## Лучшие практики

### ✅ ДЕЛАЙТЕ

- Храните все расширения модулей Fastify в `src/types/fastify.d.ts`
- Документируйте пользовательские свойства комментариями
- Используйте опциональные свойства (`?:`), когда значения могут отсутствовать
- Группируйте связанные расширения вместе

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    // Свойства аутентификации
    userId?: string
    sessionId?: string

    // Данные пользователя
    user?: User
  }
}
```

### ❌ НЕ ДЕЛАЙТЕ

- Не добавляйте `declare module` в обычные `.ts` файлы
- Не дублируйте объявления типов в разных файлах
- Не забывайте начальное выражение `import 'fastify'`

## Расширения типов плагинов

При регистрации плагинов Fastify, которые добавляют свойства:

### Пример: Плагин OAuth2

```typescript
// src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{
        access_token: string
        refresh_token?: string
        token_type: string
        expires_in: number
      }>
    }
  }
}
```

Теперь методы OAuth2 типобезопасны:

```typescript
// src/app.ts
await app.register(fastifyOAuth2, googleOAuthOptions)

// src/routes/auth.routes.ts
const token = await fastify.googleOAuth2
  .getAccessTokenFromAuthorizationCodeFlow(request)
// ✅ Полностью типизировано!
```

## Расширения типов middleware

Когда middleware добавляет свойства к запросу:

```typescript
// src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string  // Добавлено middleware requireAuth
  }
}

// src/middlewares/auth.middleware.ts
export async function requireAuth(request: FastifyRequest) {
  request.userId = 'user-123'  // ✅ Типобезопасно
}

// src/routes/auth.routes.ts
fastify.get('/me', { preHandler: requireAuth }, async (request) => {
  const userId = request.userId  // ✅ Типобезопасно
})
```

## Интеграция TypeBox

При использовании TypeBox для валидации схем вы можете определить типы запросов/ответов:

```typescript
import { Type, Static } from '@sinclair/typebox'

// Определяем схему
const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String()
})

// Выводим тип
type User = Static<typeof UserSchema>

// Используем в маршрутах Fastify с провайдером типов
fastify.withTypeProvider<TypeBoxTypeProvider>().get('/user', {
  schema: {
    response: {
      200: UserSchema
    }
  }
}, async () => {
  // Тип возвращаемого значения автоматически выводится из схемы
})
```

## Устранение проблем

### Типы не распознаются

1. **Проверьте, что tsconfig.json включает файл:**
   ```json
   {
     "include": ["src/**/*"]
   }
   ```

2. **Перезапустите сервер TypeScript:**
   - VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

3. **Проверьте, что файл назван `.d.ts`:**
   - Должно использоваться расширение `.d.ts`, а не просто `.ts`

### Конфликтующие типы

Если вы видите конфликты типов:

1. Проверьте наличие дублирующихся выражений `declare module`:
   ```bash
   grep -r "declare module 'fastify'" src/
   ```

2. Удалите дубликаты, оставьте только в `src/types/fastify.d.ts`

## Справочные материалы

- [TypeScript Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
- [Руководство Fastify по TypeScript](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [Документация TypeBox](https://github.com/sinclairzx81/typebox)

## Резюме

- ✅ Все расширения типов Fastify в `src/types/fastify.d.ts`
- ✅ Никаких `declare module` в обычных исходных файлах
- ✅ Единый источник истины для пользовательских типов
- ✅ Автоматическое обнаружение TypeScript
- ✅ Чистая, поддерживаемая система типов
