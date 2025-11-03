# Руководство по конфигурации ESLint

[English version](./ESLINT.md)

## Обзор

Этот проект использует ESLint с плагином `@stylistic/eslint-plugin` для контроля стиля кода, разделяя стилистические правила от логических согласно современным лучшим практикам.

## Зачем @stylistic/eslint-plugin?

### Предыстория

Начиная с ESLint v8.53.0, команда ESLint объявила устаревшими все правила форматирования/стиля и рекомендовала использовать специализированные форматеры типа Prettier. Однако многие разработчики предпочитают ESLint как для линтинга, так и для форматирования. Плагин `@stylistic` был создан сообществом для поддержки и улучшения этих стилистических правил вне ядра ESLint.

### Преимущества

- **Разделение ответственности**: Логические правила и стилистические четко разделены
- **Активная поддержка**: Обновления и улучшения от сообщества
- **Поддержка TypeScript**: Встроенная поддержка стилей специфичных для TypeScript
- **Современные стандарты**: Следует последним практикам ECMAScript и TypeScript
- **Нет конфликтов с форматерами**: Единый инструмент для линтинга и форматирования

## Структура конфигурации

### Файл: [eslint.config.mjs](../eslint.config.mjs)

```javascript
import eslint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  eslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: { ... },
    plugins: {
      '@typescript-eslint': tseslint,
      '@stylistic': stylistic
    },
    rules: { ... }
  }
];
```

## Категории правил

### 1. Правила TypeScript

Логические правила для качества кода TypeScript:

```javascript
'@typescript-eslint/no-explicit-any': 'warn',
'@typescript-eslint/explicit-function-return-type': 'off',
'@typescript-eslint/explicit-module-boundary-types': 'off',
'@typescript-eslint/no-unused-vars': [
  'error',
  { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
]
```

**Ключевые моменты:**
- Тип `any` вызывает предупреждение (не ошибку) для гибкости
- Явные типы возврата опциональны (TypeScript их выводит)
- Неиспользуемые переменные начинающиеся с `_` разрешены (общий паттерн)

### 2. Основные правила ESLint

Не-стилистические логические правила:

```javascript
'no-console': 'off',  // Разрешить console.log в backend коде
'sort-imports': [     // Сортировать import операторы
  'error',
  {
    ignoreCase: true,
    ignoreDeclarationSort: true
  }
]
```

### 3. Стилистические правила

Все правила форматирования используя плагин `@stylistic`:

#### Базовое форматирование

```javascript
'@stylistic/semi': ['error', 'never'],            // Без точек с запятой
'@stylistic/quotes': ['error', 'single'],         // Одинарные кавычки
'@stylistic/indent': ['error', 2],                // 2 пробела для отступов
'@stylistic/comma-dangle': ['error', 'never'],    // Без trailing запятых
'@stylistic/eol-last': ['error', 'always']        // Новая строка в конце файла
```

#### Правила отступов

```javascript
'@stylistic/object-curly-spacing': ['error', 'always'],    // { foo: bar }
'@stylistic/array-bracket-spacing': ['error', 'never'],    // [1, 2, 3]
'@stylistic/comma-spacing': ['error', { before: false, after: true }],
'@stylistic/key-spacing': ['error', { beforeColon: false, afterColon: true }],
'@stylistic/space-before-blocks': 'error',
'@stylistic/arrow-spacing': ['error', { before: true, after: true }],
'@stylistic/no-multi-spaces': 'error',
'@stylistic/keyword-spacing': ['error', { before: true, after: true }]
```

#### Отступы у функций

```javascript
'@stylistic/space-before-function-paren': [
  'error',
  {
    anonymous: 'always',    // function () {}
    named: 'never',         // function foo() {}
    asyncArrow: 'always'    // async () => {}
  }
]
```

## Примеры стиля кода

### ✅ Правильно

```typescript
// Точки с запятой, одинарные кавычки, 2 пробела для отступа
import { Type } from '@sinclair/typebox';

export function createUser(name: string, email: string) {
  return {
    id: generateId(),
    name: name,
    email: email
  };
}

// Отступы в объектах
const user = { name: 'John', email: 'john@example.com' };

// Отступы в массивах
const items = [1, 2, 3];

// Отступы в arrow функциях
const callback = async () => {
  await doSomething();
};

// Без trailing запятых
const config = {
  host: 'localhost',
  port: 3000
};
```

### ❌ Неправильно

```typescript
// Неправильно: Двойные кавычки, без точек с запятой, 4 пробела
import { Type } from "@sinclair/typebox"

export function createUser(name: string, email: string) {
    return {
        id: generateId(),
        name: name,
        email: email,  // Неправильно: Trailing запятая
    }
}

// Неправильно: Нет отступов в объекте
const user = {name: 'John', email: 'john@example.com'};

// Неправильно: Отступы в массиве
const items = [ 1, 2, 3 ];

// Неправильно: Нет отступов в arrow функции
const callback = async ()=>{
  await doSomething();
};
```

## Запуск ESLint

### Проверка на проблемы

```bash
npm run lint
```

### Авто-исправление проблем

```bash
npm run lint:fix
```

Большинство стилистических проблем можно автоматически исправить с `--fix`.

## Интеграция с IDE

### VS Code

Проект включает [.vscode/settings.json](../.vscode/settings.json) с:

```json
{
  "editor.formatOnSave": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript"
  ]
}
```

Эта конфигурация:
- Отключает встроенный форматер при сохранении
- Запускает авто-исправление ESLint при сохранении
- Валидирует TypeScript файлы

### Другие IDE

Для других IDE установите плагин ESLint и включите авто-исправление при сохранении.

## Настройка правил

### Добавление новых правил

1. **Стилистические правила**: Добавляйте с префиксом `@stylistic/`
2. **Правила TypeScript**: Добавляйте с префиксом `@typescript-eslint/`
3. **Основные правила**: Добавляйте без префикса

Пример:

```javascript
rules: {
  // Добавить стилистическое правило
  '@stylistic/max-len': ['error', { code: 100 }],

  // Добавить правило TypeScript
  '@typescript-eslint/no-floating-promises': 'error',

  // Добавить основное правило
  'no-var': 'error'
}
```

### Отключение правил

Для конкретных строк:

```typescript
// eslint-disable-next-line @stylistic/max-len
const veryLongString = 'Это очень длинная строка превышающая максимальную длину строки';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function legacy(data: any) {
  return data;
}
```

Для целых файлов:

```typescript
/* eslint-disable @stylistic/indent */
// Файл с кастомными отступами
/* eslint-enable @stylistic/indent */
```

## Доступные стилистические правила

Плагин `@stylistic` включает все устаревшие стилистические правила ESLint плюс улучшения:

### Часто используемые
- `@stylistic/semi` - Использование точки с запятой
- `@stylistic/quotes` - Стиль кавычек
- `@stylistic/indent` - Отступы
- `@stylistic/comma-dangle` - Trailing запятые
- `@stylistic/max-len` - Длина строки
- `@stylistic/brace-style` - Позиционирование скобок
- `@stylistic/object-curly-newline` - Новые строки в объектах

### Отступы
- `@stylistic/space-before-blocks`
- `@stylistic/space-before-function-paren`
- `@stylistic/space-infix-ops`
- `@stylistic/space-in-parens`
- `@stylistic/arrow-spacing`
- `@stylistic/keyword-spacing`
- `@stylistic/comma-spacing`
- `@stylistic/key-spacing`

Полный список: [ESLint Stylistic Documentation](https://eslint.style/packages/default)

## Сравнение: До и После

### До (Встроенные правила ESLint)

```javascript
rules: {
  'semi': ['error', 'always'],
  'quotes': ['error', 'single'],
  'indent': ['error', 2]
}
```

**Проблемы:**
- Объявлены устаревшими ESLint
- Нет будущих обновлений
- Ограниченная поддержка TypeScript

### После (Плагин @stylistic)

```javascript
plugins: {
  '@stylistic': stylistic
},
rules: {
  '@stylistic/semi': ['error', 'always'],
  '@stylistic/quotes': ['error', 'single'],
  '@stylistic/indent': ['error', 2]
}
```

**Преимущества:**
- Активно поддерживается
- TypeScript-aware
- Улучшения от сообщества
- Четкое разделение от логических правил

## Интеграция с TypeScript

Стилистический плагин имеет специальные правила для TypeScript:

```javascript
'@stylistic/member-delimiter-style': ['error', {
  multiline: {
    delimiter: 'semi',
    requireLast: true
  },
  singleline: {
    delimiter: 'semi',
    requireLast: false
  }
}]
```

Пример:

```typescript
// Форматирование интерфейсов
interface User {
  id: string;
  name: string;
  email: string;
}

// Форматирование type alias
type Config = {
  host: string;
  port: number;
};
```

## Решение проблем

### Конфликты правил

Если видите конфликтующие правила, проверьте:

1. Нет дублирующих правил между core ESLint и @stylistic
2. TypeScript parser правильно настроен
3. Паттерны файлов соответствуют вашим исходным файлам

### Проблемы с производительностью

Если линтинг медленный:

1. Добавьте больше паттернов в `ignores`:
   ```javascript
   {
     ignores: ['dist/', 'node_modules/', '*.js', '*.mjs', 'coverage/']
   }
   ```

2. Используйте флаг `--cache`:
   ```json
   "scripts": {
     "lint": "eslint src --ext .ts --cache"
   }
   ```

### VS Code не авто-исправляет

1. Перезапустите ESLint сервер: `Ctrl+Shift+P` → "ESLint: Restart ESLint Server"
2. Проверьте панель Output: `View` → `Output` → Выберите "ESLint"
3. Убедитесь, что `.vscode/settings.json` правильно настроен

## Миграция с Prettier

Если мигрируете с Prettier:

1. **Удалите Prettier** из package.json
2. **Удалите `.prettierrc`** и `.prettierignore`
3. **Обновите настройки VS Code**:
   ```json
   {
     "editor.defaultFormatter": null,
     "editor.formatOnSave": false,
     "editor.codeActionsOnSave": {
       "source.fixAll.eslint": "explicit"
     }
   }
   ```

4. **Запустите lint:fix** чтобы переформатировать все файлы:
   ```bash
   npm run lint:fix
   ```

## Ссылки

- [@stylistic/eslint-plugin](https://eslint.style/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [@typescript-eslint](https://typescript-eslint.io/)
- [Руководство по миграции](https://eslint.style/guide/migration)

## Резюме

- ✅ Современная flat конфигурация ESLint
- ✅ Стилистические правила через `@stylistic/eslint-plugin`
- ✅ TypeScript-aware форматирование
- ✅ Авто-исправление при сохранении в VS Code
- ✅ Четкое разделение ответственности
- ✅ Prettier не нужен
