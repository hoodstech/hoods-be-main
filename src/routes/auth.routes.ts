import type { FastifyInstance, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'
import type { AwilixContainer } from 'awilix'

import type { Container } from '~/container'
import type { GoogleUserProfile } from '~/types'

import { googleOAuthOptions } from '~/config'
import { createAuthMiddleware, requireAdmin } from '~/middlewares'
import {
  AdminCreateUserBodySchema,
  AdminUserSuccessResponseSchema,
  ErrorResponseSchema,
  LoginBodySchema,
  MessageResponseSchema,
  RegisterBodySchema,
  SuccessResponseSchema,
  UserResponseSchema
} from '~/schemas'

export async function authRoutes(
  fastify: FastifyInstance,
  container: AwilixContainer<Container>
) {
  const { authService, googleOAuthService, userRepository } = container.cradle
  const requireAuth = createAuthMiddleware(userRepository)
  // Register endpoint
  fastify.post('/auth/register', {
    schema: {
      tags: ['auth'],
      description: 'Register a new user with email and password',
      body: RegisterBodySchema,
      response: {
        201: SuccessResponseSchema,
        400: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string; name?: string }
      const user = await authService.register(body)

      // Set session cookie
      reply.setCookie('user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

      return reply.code(201).send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl
        }
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: error.message
        })
      }

      if (error instanceof Error && error.message.includes('Password is required')) {
        return reply.code(400).send({
          success: false,
          error: error.message
        })
      }

      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Login endpoint
  fastify.post('/auth/login', {
    schema: {
      tags: ['auth'],
      description: 'Login with email and password',
      body: LoginBodySchema,
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request, reply) => {
    try {
      const body = request.body as { email: string; password: string }
      const user = await authService.login(body)

      // Set session cookie
      reply.setCookie('user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl
        }
      })
    } catch (error) {
      if (error instanceof Error && (
        error.message.includes('Invalid email or password') ||
        error.message.includes('OAuth authentication')
      )) {
        return reply.code(401).send({
          success: false,
          error: error.message
        })
      }

      if (error instanceof Error && error.message.includes('inactive')) {
        return reply.code(400).send({
          success: false,
          error: error.message
        })
      }

      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Google OAuth initiate
  fastify.get('/auth/google', {
    schema: {
      tags: ['auth'],
      summary: 'Initiate Google OAuth flow',
      description: 'Redirects to Google OAuth consent screen'
    }
  }, async (request, reply) => {
    // Build OAuth authorization URL using config
    const { credentials, scope, callbackUri } = googleOAuthOptions
    const scopes = scope!.join(' ')

    // Handle callbackUri as string or function
    const redirectUri = typeof callbackUri === 'function' ? callbackUri(request) : callbackUri!

    const authUrl = new URL(`${credentials.auth!.authorizeHost}${credentials.auth!.authorizePath}`)
    authUrl.searchParams.set('client_id', credentials.client.id)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('scope', scopes)
    authUrl.searchParams.set('access_type', 'offline')

    return reply.redirect(authUrl.toString())
  })

  // Google OAuth callback
  fastify.get('/auth/google/callback', {
    schema: {
      tags: ['auth'],
      description: 'Google OAuth callback handler',
      response: {
        200: SuccessResponseSchema,
        500: ErrorResponseSchema
      }
    }
  }, async (request: FastifyRequest, reply) => {
    try {
      const token =
        await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(
          request
        )

      // Fetch user profile from Google
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v3/userinfo',
        {
          headers: {
            Authorization: `Bearer ${token.access_token}`
          }
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch user profile from Google')
      }

      const profile: GoogleUserProfile = await response.json() as unknown as GoogleUserProfile

      // Handle user creation/update
      const user = await googleOAuthService.handleGoogleCallback(profile)

      // Set session cookie
      reply.setCookie('user_id', user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      })

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Authentication failed'
      })
    }
  })

  // Get current user (protected route)
  fastify.get('/auth/me', {
    schema: {
      tags: ['auth'],
      description: 'Get current authenticated user',
      response: {
        200: Type.Object({
          success: Type.Literal(true),
          data: UserResponseSchema
        }),
        401: ErrorResponseSchema,
        404: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: requireAuth
  }, async (request, reply) => {
    try {
      const user = await authService.getUserById(request.userId!)

      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'User not found'
        })
      }

      return reply.send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          avatarUrl: user.avatarUrl
        }
      })
    } catch (error) {
      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })

  // Logout (protected route)
  fastify.post('/auth/logout', {
    schema: {
      tags: ['auth'],
      description: 'Logout current user',
      response: {
        200: MessageResponseSchema,
        401: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: requireAuth
  }, async (_request, reply) => {
    reply.clearCookie('user_id')

    return reply.send({
      success: true,
      message: 'Logged out successfully'
    })
  })

  // Admin create user (admin only)
  fastify.post<{
    Body: { email: string; password: string; name?: string; role: 'admin' | 'seller' | 'buyer' }
  }>('/auth/admin/users', {
    schema: {
      tags: ['auth'],
      summary: 'Create user with specified role',
      description: 'Admin-only endpoint to create a user with any role (admin, seller, or buyer)',
      body: AdminCreateUserBodySchema,
      response: {
        201: AdminUserSuccessResponseSchema,
        400: ErrorResponseSchema,
        401: ErrorResponseSchema,
        403: ErrorResponseSchema,
        409: ErrorResponseSchema,
        500: ErrorResponseSchema
      },
      security: [{ cookieAuth: [] }]
    },
    preHandler: [requireAuth, requireAdmin()]
  }, async (request, reply) => {
    try {
      const { email, password, name, role } = request.body

      const user = await authService.adminCreateUser({
        email,
        password,
        name,
        role
      })

      return reply.code(201).send({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          emailVerified: user.emailVerified
        }
      })
    } catch (error) {
      if (error instanceof Error && error.message.includes('already exists')) {
        return reply.code(409).send({
          success: false,
          error: error.message
        })
      }

      fastify.log.error(error)
      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
  })
}
