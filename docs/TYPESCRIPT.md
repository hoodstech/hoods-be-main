# TypeScript Configuration Guide

## Type Declarations

All Fastify module augmentations are centralized in a single location to avoid duplication and maintain consistency.

### Location

[src/types/fastify.d.ts](../src/types/fastify.d.ts)

This file contains all type extensions for the Fastify framework:

```typescript
import 'fastify';

declare module 'fastify' {
  // Request extensions
  interface FastifyRequest {
    userId?: string;  // Added by auth middleware
  }

  // Instance extensions
  interface FastifyInstance {
    googleOAuth2: {
      // OAuth2 plugin methods
    };
  }
}
```

## Why Centralize Type Declarations?

### Before (Problem)

Multiple files had duplicate `declare module` statements:

```typescript
// ❌ src/app.ts
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: { ... };
  }
}

// ❌ src/middlewares/auth.middleware.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}
```

**Issues:**
- Duplication leads to maintenance overhead
- Hard to track all type extensions
- Potential for conflicting declarations
- Violates DRY principle

### After (Solution)

Single source of truth:

```typescript
// ✅ src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }

  interface FastifyInstance {
    googleOAuth2: { ... };
  }
}
```

**Benefits:**
- Single location for all Fastify type extensions
- Easy to find and maintain
- No duplication
- Clear documentation of custom properties
- Automatic TypeScript discovery

## How It Works

### Automatic Discovery

TypeScript automatically discovers `.d.ts` files in your project based on `tsconfig.json`:

```json
{
  "include": ["src/**/*"]
}
```

All `.d.ts` files in `src/` are automatically included.

### Module Augmentation

The `declare module 'fastify'` syntax uses TypeScript's **module augmentation** feature to extend existing interfaces:

```typescript
import 'fastify';  // Import the module to augment

declare module 'fastify' {
  // Extend existing interfaces
  interface FastifyRequest {
    customProperty: string;
  }
}
```

## Adding New Type Extensions

When you need to extend Fastify types:

### 1. Identify What You're Extending

- `FastifyRequest` - Request object extensions
- `FastifyReply` - Reply object extensions
- `FastifyInstance` - Application instance extensions
- `RouteGenericInterface` - Route-specific types

### 2. Add to fastify.d.ts

```typescript
// src/types/fastify.d.ts
import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;        // Existing
    sessionId?: string;     // ✅ New addition
  }

  interface FastifyInstance {
    googleOAuth2: { ... };  // Existing
    customPlugin: { ... };  // ✅ New plugin
  }
}
```

### 3. No Import Needed

The types are globally available after declaration. Just use them:

```typescript
// Any file in your project
import type { FastifyRequest } from 'fastify';

function handler(request: FastifyRequest) {
  const userId = request.userId;      // ✅ Type-safe
  const sessionId = request.sessionId; // ✅ Type-safe
}
```

## Best Practices

### ✅ DO

- Keep all Fastify module augmentations in `src/types/fastify.d.ts`
- Document custom properties with comments
- Use optional properties (`?:`) when values may not be present
- Group related extensions together

```typescript
declare module 'fastify' {
  interface FastifyRequest {
    // Authentication properties
    userId?: string;
    sessionId?: string;

    // User data
    user?: User;
  }
}
```

### ❌ DON'T

- Don't add `declare module` in regular `.ts` files
- Don't duplicate type declarations across files
- Don't forget the initial `import 'fastify'` statement

## Plugin Type Extensions

When registering Fastify plugins that add properties:

### Example: OAuth2 Plugin

```typescript
// src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        request: FastifyRequest
      ) => Promise<{
        access_token: string;
        refresh_token?: string;
        token_type: string;
        expires_in: number;
      }>;
    };
  }
}
```

Now the OAuth2 methods are type-safe:

```typescript
// src/app.ts
await app.register(fastifyOAuth2, googleOAuthOptions);

// src/routes/auth.routes.ts
const token = await fastify.googleOAuth2
  .getAccessTokenFromAuthorizationCodeFlow(request);
// ✅ Fully typed!
```

## Middleware Type Extensions

When middleware adds properties to the request:

```typescript
// src/types/fastify.d.ts
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;  // Added by requireAuth middleware
  }
}

// src/middlewares/auth.middleware.ts
export async function requireAuth(request: FastifyRequest) {
  request.userId = 'user-123';  // ✅ Type-safe
}

// src/routes/auth.routes.ts
fastify.get('/me', { preHandler: requireAuth }, async (request) => {
  const userId = request.userId;  // ✅ Type-safe
});
```

## TypeBox Integration (Future)

When using TypeBox for schema validation, you can define request/response types:

```typescript
import { Type, Static } from '@sinclair/typebox';

// Define schema
const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String()
});

// Infer type
type User = Static<typeof UserSchema>;

// Use in Fastify routes with type provider
fastify.withTypeProvider<TypeBoxTypeProvider>().get('/user', {
  schema: {
    response: {
      200: UserSchema
    }
  }
}, async () => {
  // Return type is automatically inferred from schema
});
```

## Troubleshooting

### Types Not Being Recognized

1. **Check tsconfig.json includes the file:**
   ```json
   {
     "include": ["src/**/*"]
   }
   ```

2. **Restart TypeScript server:**
   - VS Code: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"

3. **Verify file is named `.d.ts`:**
   - Must use `.d.ts` extension, not just `.ts`

### Conflicting Types

If you see type conflicts:

1. Check for duplicate `declare module` statements:
   ```bash
   grep -r "declare module 'fastify'" src/
   ```

2. Remove duplicates, keep only in `src/types/fastify.d.ts`

## References

- [TypeScript Module Augmentation](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation)
- [Fastify TypeScript Guide](https://fastify.dev/docs/latest/Reference/TypeScript/)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)

## Summary

- ✅ All Fastify type extensions in `src/types/fastify.d.ts`
- ✅ No `declare module` in regular source files
- ✅ Single source of truth for custom types
- ✅ Automatic TypeScript discovery
- ✅ Clean, maintainable type system
