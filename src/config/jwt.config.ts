import type { FastifyJWTOptions } from '@fastify/jwt'
import { env } from './env'

export const jwtConfig: FastifyJWTOptions = {
  secret: env.JWT_SECRET,
  sign: {
    algorithm: 'HS256',
    expiresIn: env.JWT_ACCESS_EXPIRATION
  },
  verify: {
    algorithms: ['HS256']
  },
  cookie: {
    cookieName: 'access_token',
    signed: false // We'll use httpOnly and secure flags instead
  }
}

export const JWT_CONSTANTS = {
  ACCESS_TOKEN_EXPIRATION: env.JWT_ACCESS_EXPIRATION,
  REFRESH_TOKEN_EXPIRATION: env.JWT_REFRESH_EXPIRATION,
  ISSUER: 'hoods-api',
  AUDIENCE: 'hoods-users'
} as const