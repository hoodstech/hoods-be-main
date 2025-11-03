import 'fastify'
import type { UserRole } from '~/db/schemas'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
    userRole?: UserRole
  }

  interface FastifyInstance {
    googleOAuth2: {
      getAccessTokenFromAuthorizationCodeFlow: (
        _request: FastifyRequest
      ) => Promise<{
        access_token: string
        refresh_token?: string
        token_type: string
        expires_in: number
      }>
    }
  }
}
