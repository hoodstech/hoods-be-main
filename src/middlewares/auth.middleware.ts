import type { FastifyReply, FastifyRequest } from 'fastify'

import type { AuthService } from '~/services'
import type { JWTPayload } from '~/services/auth.service'
import { extractToken } from '~/utils/jwt.utils'

export function createAuthMiddleware(authService: AuthService) {
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    try {
      // Extract token from cookie or Authorization header
      const token = extractToken(request.cookies, request.headers.authorization)

      if (!token) {
        return reply.code(401).send({
          success: false,
          error: 'Not authenticated'
        })
      }

      // Verify JWT signature and decode
      let payload: JWTPayload
      try {
        payload = await request.jwtVerify<JWTPayload>()
      } catch (error) {
        return reply.code(401).send({
          success: false,
          error: 'Invalid or expired token'
        })
      }

      // Verify session is still valid (not blacklisted)
      const isValid = await authService.verifyToken(payload.jti, payload.sub)
      if (!isValid) {
        return reply.code(401).send({
          success: false,
          error: 'Session expired or revoked'
        })
      }

      // Verify IP address if strict mode enabled
      const ipMatch = await authService.verifyIpAddress(payload.jti, request.ip)
      if (!ipMatch) {
        return reply.code(401).send({
          success: false,
          error: 'IP address mismatch'
        })
      }

      // Attach user data to request
      request.userId = payload.sub
      request.userRole = payload.role
      request.jti = payload.jti
    } catch (error) {
      request.log.error(error, 'Authentication error')
      return reply.code(500).send({
        success: false,
        error: 'Internal authentication error'
      })
    }
  }
}
