import { Type } from '@sinclair/typebox'

// Request schemas
export const RegisterBodySchema = Type.Object({
  email: Type.String({ format: 'email', description: 'User email address' }),
  password: Type.String({ minLength: 8, description: 'User password (minimum 8 characters)' }),
  name: Type.Optional(Type.String({ description: 'User full name' }))
}, {
  $id: 'RegisterBody',
  description: 'User registration request body'
})

export const LoginBodySchema = Type.Object({
  email: Type.String({ format: 'email', description: 'User email address' }),
  password: Type.String({ description: 'User password' })
}, {
  $id: 'LoginBody',
  description: 'User login request body'
})

export const CreateSellerBodySchema = Type.Object({
  email: Type.String({ format: 'email', description: 'Seller email address' }),
  password: Type.String({ minLength: 8, description: 'Seller password (minimum 8 characters)' }),
  name: Type.String({ description: 'Seller name' })
}, {
  $id: 'CreateSellerBody',
  description: 'Create seller request body (admin only)'
})

export const AdminCreateUserBodySchema = Type.Object({
  email: Type.String({ format: 'email', description: 'User email address' }),
  password: Type.String({ minLength: 8, description: 'User password (minimum 8 characters)' }),
  name: Type.Optional(Type.String({ description: 'User full name' })),
  role: Type.Union([
    Type.Literal('admin'),
    Type.Literal('seller'),
    Type.Literal('buyer')
  ], { description: 'User role' })
}, {
  $id: 'AdminCreateUserBody',
  description: 'Admin create user request body'
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

export const AdminUserResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'User ID' }),
  email: Type.String({ format: 'email', description: 'User email' }),
  name: Type.Optional(Type.String({ description: 'User name' })),
  role: Type.Union([
    Type.Literal('admin'),
    Type.Literal('seller'),
    Type.Literal('buyer')
  ], { description: 'User role' }),
  isActive: Type.Boolean({ description: 'Account active status' }),
  emailVerified: Type.Boolean({ description: 'Email verification status' })
}, {
  $id: 'AdminUserResponse',
  description: 'Admin user data response with role'
})

export const SellerResponseSchema = Type.Object({
  id: Type.String({ format: 'uuid', description: 'Seller ID' }),
  email: Type.String({ format: 'email', description: 'Seller email' }),
  name: Type.String({ description: 'Seller name' }),
  role: Type.Literal('seller', { description: 'User role' }),
  isActive: Type.Boolean({ description: 'Account active status' })
}, {
  $id: 'SellerResponse',
  description: 'Seller data response'
})

export const SellerSuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: SellerResponseSchema
}, {
  $id: 'SellerSuccessResponse',
  description: 'Successful response with seller data'
})

export const SuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: UserResponseSchema
}, {
  $id: 'SuccessResponse',
  description: 'Successful response with user data'
})

export const AdminUserSuccessResponseSchema = Type.Object({
  success: Type.Literal(true),
  data: AdminUserResponseSchema
}, {
  $id: 'AdminUserSuccessResponse',
  description: 'Successful response with admin user data'
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
