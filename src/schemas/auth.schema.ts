import { Type } from '@sinclair/typebox'

// Request schemas
export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', description: 'User email address' }),
  name: Type.Optional(Type.String({ description: 'User full name' }))
}, {
  $id: 'RegisterBody',
  description: 'User registration request body'
})

// Response schemas
export const UserResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'User ID' }),
  email: Type.String({ format: 'email', description: 'User email' }),
  name: Type.Optional(Type.String({ description: 'User name' })),
  avatarUrl: Type.Optional(Type.String({ description: 'User avatar URL' }))
}, {
  $id: 'UserResponse',
  description: 'User data response'
})

export const SuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: UserResponseSchema
}, {
  $id: 'SuccessResponse',
  description: 'Successful response with user data'
})

export const ErrorResponseSchema = Type.Object({
  success: Type.Literal(false),
  error: Type.String({ description: 'Error message' }),
  details: Type.Optional(Type.Any({ description: 'Additional error details' }))
}, {
  $id: 'ErrorResponse',
  description: 'Error response'
})

export const MessageResponseSchema = Type.Object({
  success: Type.Literal(true),
  message: Type.String({ description: 'Success message' })
}, {
  $id: 'MessageResponse',
  description: 'Success message response'
})

export const HealthResponseSchema = Type.Object({
  status: Type.String({ description: 'Health status' }),
  timestamp: Type.String({ format: 'date-time', description: 'Current timestamp' })
}, {
  $id: 'HealthResponse',
  description: 'Health check response'
})
