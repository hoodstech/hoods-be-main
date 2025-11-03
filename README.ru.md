# Hoods Backend

[English version](./README.md) | [Быстрый старт](./QUICKSTART.ru.md) | [Архитектура](./ARCHITECTURE.ru.md)

Масштабируемое backend API на TypeScript, Fastify, PostgreSQL и Drizzle ORM с аутентификацией через Google OAuth и чистой архитектурой на основе паттерна Repository.

**Новичок в проекте?** Прочитайте [Руководство по быстрому старту](./QUICKSTART.ru.md) чтобы начать работу за 5 минут!

## Возможности

- TypeScript для типобезопасности
- Веб-фреймворк Fastify для высокой производительности
- База данных PostgreSQL с Drizzle ORM
- Аутентификация через Google OAuth 2.0
- Паттерн Repository для чистого доступа к данным
- Слоистая архитектура для масштабируемости
- Конфигурация на основе окружения
- ESLint для качества кода

## Архитектура проекта

```
src/
├── config/          # Конфигурация (env, OAuth)
├── db/              # Настройка БД и схемы
│   ├── migrations/  # Миграции базы данных
│   └── schemas/     # Drizzle схемы
├── repositories/    # Паттерн Repository для доступа к данным
├── services/        # Слой бизнес-логики
├── routes/          # Обработчики маршрутов API
├── middlewares/     # Пользовательские middleware
├── types/           # Определения типов TypeScript
├── app.ts           # Настройка приложения Fastify
└── index.ts         # Точка входа в приложение
```

## Требования

- Node.js (v18 или выше)
- PostgreSQL (v14 или выше)
- Учетные данные Google OAuth

## Начало работы

### 1. Установка зависимостей

```bash
npm install
```

### 2. Настройка базы данных

#### Вариант A: Использование Docker (Рекомендуется)

Запустите PostgreSQL используя Docker Compose:

```bash
npm run docker:dev
```

Это запустит PostgreSQL контейнер с учетными данными из [.env.development](.env.development).

#### Вариант B: Ручная установка PostgreSQL

Если у вас установлен PostgreSQL локально:

```bash
createdb hoods_db
```

### 3. Настройка окружения

Скопируйте файл окружения для разработки и обновите учетные данные:

```bash
cp .env.development .env
```

Обновите следующие параметры в `.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/hoods_db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
COOKIE_SECRET=your-super-secret-cookie-key
```

#### Получение учетных данных Google OAuth

1. Перейдите в [Google Cloud Console](https://console.cloud.google.com/)
2. Создайте новый проект или выберите существующий
3. Включите Google+ API
4. Перейдите в Credentials > Create Credentials > OAuth 2.0 Client ID
5. Добавьте авторизованный URI перенаправления: `http://localhost:3000/auth/google/callback`
6. Скопируйте Client ID и Client Secret в ваш файл `.env`

### 4. Генерация и запуск миграций

```bash
# Генерация файлов миграций из схемы
npm run db:generate

# Запуск миграций
npm run db:migrate
```

### 5. Запуск сервера разработки

```bash
npm run dev
```

Сервер запустится на `http://localhost:3000`

## Доступные команды

### Разработка
- `npm run dev` - Запуск сервера разработки с горячей перезагрузкой
- `npm run lint` - Запуск ESLint
- `npm run lint:fix` - Исправление ошибок ESLint

### База данных
- `npm run db:generate` - Генерация файлов миграций
- `npm run db:migrate` - Запуск миграций базы данных
- `npm run db:studio` - Открыть Drizzle Studio (GUI для БД)

### Production
- `npm run build` - Сборка для production
- `npm start` - Запуск production сервера

### Docker
- `npm run docker:dev` - Запустить PostgreSQL в Docker (разработка)
- `npm run docker:dev:down` - Остановить PostgreSQL контейнер (разработка)
- `npm run docker:prod` - Запустить полный стек в Docker (production)
- `npm run docker:prod:down` - Остановить production контейнеры
- `npm run docker:prod:build` - Пересобрать и запустить production контейнеры

## API эндпоинты

### Аутентификация

#### Регистрация пользователя
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "name": "Иван Иванов"
}
```

#### Вход через Google OAuth
```http
GET /auth/google
```
Перенаправляет на страницу согласия Google OAuth

#### Callback Google OAuth
```http
GET /auth/google/callback
```
Обрабатывается автоматически в потоке OAuth

#### Получить текущего пользователя (Защищенный)
```http
GET /auth/me
Cookie: user_id=<session-id>
```

#### Выход (Защищенный)
```http
POST /auth/logout
Cookie: user_id=<session-id>
```

### Проверка здоровья
```http
GET /health
```

## Схема базы данных

### Таблица Users

| Колонка | Тип | Описание |
|---------|-----|----------|
| id | UUID | Первичный ключ |
| email | VARCHAR(255) | Уникальный email |
| google_id | VARCHAR(255) | Google OAuth ID |
| name | VARCHAR(255) | Имя пользователя |
| avatar_url | VARCHAR(500) | URL фото профиля |
| is_active | BOOLEAN | Статус аккаунта |
| created_at | TIMESTAMP | Время создания |
| updated_at | TIMESTAMP | Время последнего обновления |

## Расширение проекта

### Добавление новой функции

1. **Создайте схему** - Добавьте новую таблицу в `src/db/schemas/`
2. **Создайте репозиторий** - Реализуйте доступ к данным в `src/repositories/`
3. **Создайте сервис** - Добавьте бизнес-логику в `src/services/`
4. **Создайте маршруты** - Добавьте API эндпоинты в `src/routes/`
5. **Зарегистрируйте маршруты** - Импортируйте и зарегистрируйте в `src/app.ts`

### Пример: Добавление функции постов

```typescript
// 1. src/db/schemas/posts.schema.ts
export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// 2. src/repositories/post.repository.ts
export class PostRepository extends BaseRepository {
  async findByUserId(userId: string): Promise<Post[]> {
    return this.db.select().from(posts).where(eq(posts.userId, userId));
  }
}

// 3. src/services/post.service.ts
export class PostService {
  constructor(private postRepository: PostRepository) {}

  async getUserPosts(userId: string): Promise<Post[]> {
    return this.postRepository.findByUserId(userId);
  }
}

// 4. src/routes/post.routes.ts
export async function postRoutes(fastify: FastifyInstance, postService: PostService) {
  fastify.get('/posts', { preHandler: requireAuth }, async (request) => {
    return postService.getUserPosts(request.userId!);
  });
}
```

## Псевдонимы путей

Проект использует `~` как псевдоним для директории `src`:

```typescript
import { db } from '~/db/index.js';
import { UserRepository } from '~/repositories/index.js';
```

Настройте это в вашей IDE для правильных импортов и навигации.

## Production развертывание

### Вариант 1: Развертывание с Docker (Рекомендуется)

1. Обновите [.env.production](.env.production) с production учетными данными
2. Соберите и запустите контейнеры:

```bash
npm run docker:prod:build
```

Это выполнит:
- Сборку Docker образа приложения
- Запуск PostgreSQL и приложения
- Настройку сети между сервисами

### Вариант 2: Ручное развертывание

1. Обновите [.env.production](.env.production) с production учетными данными
2. Соберите проект:

```bash
npm run build
```

3. Запустите миграции:

```bash
NODE_ENV=production npm run db:migrate
```

4. Запустите сервер:

```bash
NODE_ENV=production npm start
```

### Переменные окружения для Production

**Критично:** Обновите эти параметры в [.env.production](.env.production):

- `DATABASE_URL` - Строка подключения к production базе данных
- `POSTGRES_USER` - Пользователь production базы данных
- `POSTGRES_PASSWORD` - Сильный пароль базы данных
- `GOOGLE_CLIENT_ID` - Production Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Production Google OAuth секрет
- `GOOGLE_CALLBACK_URL` - Production callback URL (например, `https://yourdomain.com/auth/google/callback`)
- `COOKIE_SECRET` - Сильный случайный секрет для cookies (минимум 32 символа)
- `APP_URL` - Production URL приложения

## Соображения безопасности

- Никогда не коммитьте `.env` файлы
- Используйте сильные секреты в production
- Включите HTTPS в production
- Регулярно меняйте OAuth учетные данные
- Реализуйте rate limiting для production
- Добавьте валидацию входных данных для всех эндпоинтов
- Используйте prepared statements (Drizzle это обрабатывает)

## Лицензия

ISC
