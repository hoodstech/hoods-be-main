import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UserRepository } from '~/repositories'

export function createAuthMiddleware(userRepository: UserRepository) {
  return async function requireAuth(
    request: FastifyRequest,
    reply: FastifyReply
  ) {
    const userId = request.cookies.user_id

    if (!userId) {
      return reply.code(401).send({
        success: false,
        error: 'Not authenticated'
      })
    }

    // Fetch user to get role
    const user = await userRepository.findById(userId)
    if (!user || !user.isActive) {
      return reply.code(401).send({
        success: false,
        error: 'Invalid or inactive user'
      })
    }

    // Attach userId and userRole to request for downstream handlers
    request.userId = userId
    request.userRole = user.role
  }
}
