import type { FastifyReply, FastifyRequest } from 'fastify'

import type { UserRole } from '~/db/schemas'

export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Check if user is authenticated
    if (!request.userId) {
      return reply.code(401).send({
        success: false,
        error: 'Authentication required'
      })
    }

    // Check if user role is allowed
    if (!request.userRole || !allowedRoles.includes(request.userRole)) {
      return reply.code(403).send({
        success: false,
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      })
    }
  }
}

// Convenience functions for common roles
export const requireAdmin = () => requireRole('admin')
export const requireSeller = () => requireRole('seller', 'admin')
export const requireBuyer = () => requireRole('buyer', 'admin')
