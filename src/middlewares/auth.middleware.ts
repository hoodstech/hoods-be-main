import type { FastifyReply, FastifyRequest } from 'fastify'

export async function requireAuth(
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

  // Attach userId to request for downstream handlers
  request.userId = userId
}
