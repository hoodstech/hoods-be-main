# ESLint Configuration Guide

[Русская версия](./ESLINT.ru.md)

## Overview

This project uses ESLint with the `@stylistic/eslint-plugin` for code style enforcement, separating stylistic rules from logical rules according to modern best practices.

## Why @stylistic/eslint-plugin?

### Background

Starting with ESLint v8.53.0, the ESLint team deprecated all formatting/stylistic rules and recommended using dedicated formatters like Prettier. However, many developers prefer ESLint for both linting and formatting. The `@stylistic` plugin was created by the community to maintain and improve these stylistic rules outside of ESLint core.

### Benefits

- **Separation of Concerns**: Logical rules vs. stylistic rules are clearly separated
- **Active Maintenance**: Community-driven updates and improvements
- **TypeScript Support**: Built-in support for TypeScript-specific styling
- **Modern Standards**: Follows latest ECMAScript and TypeScript practices
- **No Formatter Conflicts**: Single tool for linting and formatting

## Configuration Structure

### File: [eslint.config.mjs](../eslint.config.mjs)

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

## Rule Categories

### 1. TypeScript Rules

Logical rules for TypeScript code quality:

```javascript
'@typescript-eslint/no-explicit-any': 'warn',
'@typescript-eslint/no-unused-vars': [
  'error',
  { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
]
```

### 2. Stylistic Rules

All formatting rules using `@stylistic` plugin:

```javascript
'@stylistic/semi': ['error', 'never'],            // No semicolons
'@stylistic/quotes': ['error', 'single'],         // Single quotes
'@stylistic/indent': ['error', 2],                // 2-space indentation
'@stylistic/comma-dangle': ['error', 'never']     // No trailing commas
```

## Running ESLint

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## References

- [@stylistic/eslint-plugin](https://eslint.style/)
- [ESLint Flat Config](https://eslint.org/docs/latest/use/configure/configuration-files)
- [@typescript-eslint](https://typescript-eslint.io/)
