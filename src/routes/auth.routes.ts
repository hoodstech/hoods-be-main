import type { FastifyInstance, FastifyRequest } from 'fastify'
import { Type } from '@sinclair/typebox'

import type { AuthService } from '~/services'
import type { GoogleUserProfile } from '~/types'

import { requireAuth } from '~/middlewares'
import {
  ErrorResponseSchema,
  MessageResponseSchema,
  RegisterBodySchema,
  SuccessResponseSchema,
  UserResponseSchema
} from '~/schemas'

export async function authRoutes(
  fastify: FastifyInstance,
  authService: AuthService
) {
  // Register endpoint
  fastify.post('/auth/register', {
    schema: {
      tags: ['auth'],
      description: 'Register a new user',
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
      const body = request.body as { email: string; name?: string }
      const user = await authService.register(body)

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

      return reply.code(500).send({
        success: false,
        error: 'Internal server error'
      })
    }
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
      const user = await authService.handleGoogleCallback(profile)

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
}
