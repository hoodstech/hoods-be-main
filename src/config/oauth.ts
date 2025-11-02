import type { FastifyOAuth2Options } from '@fastify/oauth2'

import { env } from './env'

export const googleOAuthOptions: FastifyOAuth2Options = {
  name: 'googleOAuth2',
  scope: ['profile', 'email'],
  credentials: {
    client: {
      id: env.GOOGLE_CLIENT_ID,
      secret: env.GOOGLE_CLIENT_SECRET
    },
    auth: {
      authorizeHost: 'https://accounts.google.com',
      authorizePath: '/o/oauth2/v2/auth',
      tokenHost: 'https://www.googleapis.com',
      tokenPath: '/oauth2/v4/token'
    }
  },
  startRedirectPath: '/auth/google',
  callbackUri: env.GOOGLE_CALLBACK_URL
}
