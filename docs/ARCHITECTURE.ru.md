# Обзор архитектуры

[English version](./ARCHITECTURE.md)

## Структура проекта

```
hoods-be-main/
├── src/
│   ├── config/              # Управление конфигурацией
│   │   ├── env.ts          # Валидация переменных окружения (Zod)
│   │   ├── oauth.ts        # Конфигурация Google OAuth
│   │   └── index.ts        # Экспорт конфигурации
│   │
│   ├── db/                  # Слой базы данных
│   │   ├── migrations/     # Файлы миграций Drizzle (автогенерация)
│   │   ├── schemas/        # Схемы таблиц базы данных
│   │   │   ├── users.schema.ts
│   │   │   └── index.ts
│   │   ├── index.ts        # Настройка подключения к БД
│   │   └── migrate.ts      # Скрипт запуска миграций
│   │
│   ├── repositories/        # Слой доступа к данным (паттерн Repository)
│   │   ├── base.repository.ts
│   │   ├── user.repository.ts
│   │   └── index.ts
│   │
│   ├── services/            # Слой бизнес-логики
│   │   ├── auth.service.ts
│   │   └── index.ts
│   │
│   ├── routes/              # API маршруты/контроллеры
│   │   ├── auth.routes.ts
│   │   └── index.ts
│   │
│   ├── middlewares/         # Пользовательские middleware
│   │   ├── auth.middleware.ts
│   │   └── index.ts
│   │
│   ├── types/               # Определения типов TypeScript
│   │   ├── auth.types.ts
│   │   └── index.ts
│   │
│   ├── app.ts               # Настройка приложения Fastify
│   └── index.ts             # Точка входа в приложение
│
├── .vscode/                 # Настройки VS Code
├── docker-compose.development.yml
├── docker-compose.production.yml
├── Dockerfile
├── .dockerignore
├── .env.development         # Переменные окружения для разработки
├── .env.production          # Переменные окружения для production
├── .gitignore
├── drizzle.config.ts        # Конфигурация Drizzle Kit
├── eslint.config.mjs        # Конфигурация ESLint
├── package.json
├── tsconfig.json            # Конфигурация TypeScript
├── README.md
├── README.ru.md
├── ARCHITECTURE.md
└── ARCHITECTURE.ru.md       # Этот файл
```

## Архитектурные паттерны

### 1. Слоистая архитектура

Приложение следует строгой слоистой архитектуре:

```
┌─────────────────────────────────────┐
│      Маршруты (API слой)            │  ← HTTP запросы/ответы
├─────────────────────────────────────┤
│    Сервисы (Бизнес-логика)          │  ← Бизнес-правила
├─────────────────────────────────────┤
│ Репозитории (Слой доступа к данным) │  ← Запросы к БД
├─────────────────────────────────────┤
│       База данных (PostgreSQL)      │  ← Хранение данных
└─────────────────────────────────────┘
```

**Преимущества:**
- Четкое разделение ответственности
- Легко тестировать каждый слой независимо
- Изменения в одном слое не влияют на другие
- Масштабируемость и поддерживаемость

### 2. Паттерн Repository

Паттерн Repository абстрагирует операции с базой данных:

```typescript
// Базовый репозиторий предоставляет общую функциональность
abstract class BaseRepository {
  constructor(protected db: Database) {}
}

// Конкретные репозитории реализуют логику домена
class UserRepository extends BaseRepository {
  async findById(id: string): Promise<User | undefined> { }
  async findByEmail(email: string): Promise<User | undefined> { }
  async create(user: NewUser): Promise<User> { }
}
```

**Преимущества:**
- Централизованная логика доступа к данным
- Легко мокировать для тестирования
- Бизнес-логика не зависит от базы данных
- Переиспользуемые запросы

### 3. Внедрение зависимостей

Сервисы и репозитории внедряются, а не создаются напрямую:

```typescript
// В app.ts
const userRepository = new UserRepository(db);
const authService = new AuthService(userRepository);
await authRoutes(app, authService);
```

**Преимущества:**
- Слабая связанность
- Легко тестировать с моками
- Гибкая конфигурация

### 4. Паттерн Middleware

Аутентификация обрабатывается через переиспользуемый middleware:

```typescript
// Защищенный маршрут
fastify.get('/auth/me', {
  preHandler: requireAuth  // Внедрение middleware
}, async (request, reply) => {
  // request.userId теперь доступен
});
```

## Поток данных

### Поток аутентификации (Google OAuth)

```
Пользователь нажимает "Войти через Google"
    ↓
GET /auth/google (плагин Fastify OAuth2)
    ↓
Перенаправление на Google OAuth
    ↓
Пользователь авторизуется
    ↓
GET /auth/google/callback
    ↓
Обмен кода на access token
    ↓
Получение профиля пользователя от Google
    ↓
AuthService.handleGoogleCallback()
    ↓
UserRepository.findByGoogleId() или create()
    ↓
Установка session cookie
    ↓
Возврат данных пользователя
```

### Поток защищенного маршрута

```
Запрос с cookie
    ↓
requireAuth middleware
    ↓
Извлечение userId из cookie
    ↓
Присвоение request.userId
    ↓
Обработчик маршрута
    ↓
Слой сервисов
    ↓
Слой репозиториев
    ↓
Запрос к базе данных
    ↓
Ответ
```

## Технологический стек

### Основа
- **TypeScript**: Типобезопасность и лучший опыт разработки
- **Fastify**: Быстрый и эффективный веб-фреймворк
- **PostgreSQL**: Надежная реляционная база данных
- **Drizzle ORM**: Типобезопасные запросы к базе данных

### Аутентификация
- **@fastify/oauth2**: Реализация OAuth 2.0 клиента
- **@fastify/cookie**: Управление сессиями через cookies

### Разработка
- **tsx**: Быстрое выполнение TypeScript
- **ESLint**: Качество и консистентность кода
- **Drizzle Kit**: Миграции базы данных

### Развертывание
- **Docker**: Контейнеризация
- **Docker Compose**: Оркестрация мульти-контейнеров

## Принципы проектирования

### 1. Единственная ответственность
Каждый модуль имеет одну причину для изменения:
- Маршруты обрабатывают HTTP
- Сервисы обрабатывают бизнес-логику
- Репозитории обрабатывают доступ к данным

### 2. DRY (Don't Repeat Yourself)
- Базовый репозиторий для общих операций
- Централизованная конфигурация
- Переиспользуемые middleware

### 3. SOLID принципы
- **S**: Каждый класс имеет одну ответственность
- **O**: Сервисы могут быть расширены без модификации
- **L**: Репозитории взаимозаменяемы
- **I**: Маленькие, сфокусированные интерфейсы
- **D**: Зависимость от абстракций (интерфейс Database)

### 4. Псевдонимы путей
Использование `~` для более чистых импортов:
```typescript
import { db } from '~/db/index.js';
import { UserRepository } from '~/repositories/index.js';
```

## Расширяемость

### Добавление новой функции

Пример: Добавление функции постов

1. **Схема** ([src/db/schemas/posts.schema.ts](src/db/schemas/posts.schema.ts)):
```typescript
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow()
});
```

2. **Репозиторий** ([src/repositories/post.repository.ts](src/repositories/post.repository.ts)):
```typescript
export class PostRepository extends BaseRepository {
  async findByUserId(userId: string) {
    return this.db.select().from(posts)
      .where(eq(posts.userId, userId));
  }
}
```

3. **Сервис** ([src/services/post.service.ts](src/services/post.service.ts)):
```typescript
export class PostService {
  constructor(private postRepository: PostRepository) {}

  async getUserPosts(userId: string) {
    return this.postRepository.findByUserId(userId);
  }
}
```

4. **Маршруты** ([src/routes/post.routes.ts](src/routes/post.routes.ts)):
```typescript
export async function postRoutes(
  fastify: FastifyInstance,
  postService: PostService
) {
  fastify.get('/posts', {
    preHandler: requireAuth
  }, async (request) => {
    return postService.getUserPosts(request.userId!);
  });
}
```

5. **Регистрация** в [src/app.ts](src/app.ts):
```typescript
const postRepository = new PostRepository(db);
const postService = new PostService(postRepository);
await postRoutes(app, postService);
```

## Лучшие практики

### 1. Типобезопасность
- Используйте выводимые типы Drizzle
- Валидируйте переменные окружения с Zod
- Определяйте четкие интерфейсы для DTO

### 2. Обработка ошибок
- Возвращайте соответствующие HTTP коды статуса
- Используйте try-catch в обработчиках маршрутов
- Логируйте ошибки для отладки

### 3. Безопасность
- Никогда не коммитьте `.env` файлы
- Используйте HTTPS в production
- Реализуйте rate limiting
- Валидируйте все входные данные
- Используйте prepared statements (Drizzle это обрабатывает)

### 4. Миграции базы данных
- Всегда генерируйте миграции: `npm run db:generate`
- Проверяйте файлы миграций перед применением
- Запускайте миграции перед стартом приложения

### 5. Стиль кода
- Следуйте правилам ESLint
- Без trailing запятых
- Одинарные кавычки
- 2 пробела для отступов
- Абсолютные импорты с `~` для внутренних модулей

## Соображения производительности

### 1. База данных
- Используйте индексы на часто запрашиваемых колонках
- Connection pooling (обрабатывается postgres.js)
- Ленивая загрузка связей

### 2. Кэширование
- Рассмотрите Redis для хранения сессий в production
- Кэшируйте часто запрашиваемые данные

### 3. Docker
- Multi-stage сборки для меньших образов
- Non-root пользователь для безопасности
- Health checks для надежности

## Стратегия тестирования (Будущее)

```
src/
├── __tests__/
│   ├── unit/           # Юнит-тесты для сервисов
│   ├── integration/    # Интеграционные тесты для репозиториев
│   └── e2e/            # End-to-end тесты API
```

Рекомендуемые инструменты:
- **Vitest**: Быстрое юнит-тестирование
- **Testcontainers**: Интеграционные тесты с реальным PostgreSQL
- **Supertest**: Тестирование API эндпоинтов

## Мониторинг (Будущее)

- Добавить структурированное логирование (pino)
- Реализовать метрики (Prometheus)
- Добавить APM (Application Performance Monitoring)
- Настроить алерты для ошибок
