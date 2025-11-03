# Swagger/OpenAPI Documentation

[Русская версия](./SWAGGER.ru.md)

## Overview

This project uses Swagger/OpenAPI for automatic API documentation with `@fastify/swagger` and `@fastify/swagger-ui`.

## Accessing the Documentation

### Development
Visit [http://localhost:3000/docs](http://localhost:3000/docs) to view the interactive API documentation.

### Production
The documentation will be available at `https://yourdomain.com/docs`

## Features

- ✅ **Interactive API Testing**: Test endpoints directly from the documentation
- ✅ **TypeBox Integration**: Type-safe schemas using `@sinclair/typebox`
- ✅ **Request/Response Examples**: Automatic examples generated from schemas
- ✅ **Authentication Support**: Cookie-based authentication documented
- ✅ **OpenAPI 3.x**: Modern OpenAPI specification

## Configuration

The Swagger configuration is in [src/app.ts](../src/app.ts):

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

## Adding Documentation to Routes

### Basic Example

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

### With Request Body

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
  // Handler logic
})
```

### Protected Endpoints

```typescript
fastify.get('/auth/me', {
  schema: {
    tags: ['auth'],
    description: 'Get current authenticated user',
    response: {
      200: UserResponseSchema,
      401: ErrorResponseSchema
    },
    security: [{ cookieAuth: [] }]  // Indicates authentication required
  },
  preHandler: requireAuth
}, async (request, reply) => {
  // Handler logic
})
```

## Creating Schemas

Schemas are defined in [src/schemas/](../src/schemas/) using TypeBox:

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

### Schema Properties

- **$id**: Unique identifier for the schema (reusable across routes)
- **description**: Schema-level description
- **format**: Data format (uuid, email, date-time, etc.)
- **Type.Optional**: Marks field as optional

## Available Schemas

Located in [src/schemas/auth.schema.ts](../src/schemas/auth.schema.ts):

| Schema | Description |
|--------|-------------|
| `RegisterBodySchema` | User registration request |
| `UserResponseSchema` | User data response |
| `SuccessResponseSchema` | Successful operation with user data |
| `ErrorResponseSchema` | Error response |
| `MessageResponseSchema` | Success message response |
| `HealthResponseSchema` | Health check response |

## Response Status Codes

Document all possible responses for each endpoint:

```typescript
schema: {
  response: {
    200: SuccessResponseSchema,     // Success
    400: ErrorResponseSchema,        // Bad request / Validation error
    401: ErrorResponseSchema,        // Unauthorized
    404: ErrorResponseSchema,        // Not found
    409: ErrorResponseSchema,        // Conflict (e.g., duplicate email)
    500: ErrorResponseSchema         // Server error
  }
}
```

## TypeBox vs Zod

This project uses **TypeBox** instead of Zod for several reasons:

| Feature | TypeBox | Zod |
|---------|---------|-----|
| **JSON Schema** | ✅ Native | ⚠️ Requires conversion |
| **Swagger Integration** | ✅ Seamless | ⚠️ Extra plugins needed |
| **Performance** | ✅ Faster | Slower |
| **Bundle Size** | ✅ Smaller | Larger |
| **Fastify Support** | ✅ Official plugin | Manual setup |

### Example Comparison

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

TypeBox integrates directly with Fastify's schema system, while Zod requires additional transformation layers.

## Adding New Endpoints

### 1. Create Schema (if needed)

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

### 2. Add Route with Schema

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
  // Create post logic
})
```

### 3. Update Tags (if needed)

Add new tag in [src/app.ts](../src/app.ts):

```typescript
tags: [
  { name: 'auth', description: 'Authentication endpoints' },
  { name: 'posts', description: 'Post management' },  // New tag
  { name: 'health', description: 'Health check endpoints' }
]
```

## Advanced Features

### Custom Response Examples

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

### Query Parameters

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
  // Handler logic
})
```

### Path Parameters

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
  // Handler logic
})
```

## Exporting OpenAPI Spec

To export the OpenAPI specification as JSON:

```typescript
// After app starts
await app.ready()
const spec = app.swagger()
console.log(JSON.stringify(spec, null, 2))
```

Or add an endpoint to serve the spec:

```typescript
app.get('/api/openapi.json', async () => {
  return app.swagger()
})
```

## Best Practices

### 1. Use $id for Reusable Schemas
```typescript
const UserSchema = Type.Object({ ... }, { $id: 'User' })
// Can be referenced in multiple endpoints
```

### 2. Document All Responses
```typescript
response: {
  200: SuccessSchema,
  400: ErrorSchema,  // Don't forget error cases
  401: ErrorSchema,
  500: ErrorSchema
}
```

### 3. Add Descriptions
```typescript
Type.String({ description: 'User email address', format: 'email' })
```

### 4. Use Proper HTTP Status Codes
- `200` - Success (GET, PUT)
- `201` - Created (POST)
- `204` - No Content (DELETE)
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Server Error

### 5. Group Related Endpoints with Tags
```typescript
schema: {
  tags: ['auth'],  // Groups all auth endpoints together
  // ...
}
```

## Troubleshooting

### Schemas Not Appearing

1. Check that `$id` is unique
2. Ensure schema is used in at least one route
3. Verify TypeBox version compatibility

### Type Validation Not Working

Make sure you're using `.withTypeProvider<TypeBoxTypeProvider>()`:

```typescript
const app = fastify().withTypeProvider<TypeBoxTypeProvider>()
```

### Documentation Not Updating

1. Restart the server
2. Clear browser cache
3. Check for TypeScript compilation errors

## References

- [@fastify/swagger Documentation](https://github.com/fastify/fastify-swagger)
- [@fastify/swagger-ui Documentation](https://github.com/fastify/fastify-swagger-ui)
- [TypeBox Documentation](https://github.com/sinclairzx81/typebox)
- [OpenAPI Specification](https://swagger.io/specification/)

## Summary

- ✅ Interactive API documentation at `/docs`
- ✅ TypeBox for type-safe schemas
- ✅ Automatic request/response validation
- ✅ OpenAPI 3.x specification
- ✅ Cookie authentication support
- ✅ Extensible and maintainable
