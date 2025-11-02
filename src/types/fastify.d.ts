import 'fastify'

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string
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
