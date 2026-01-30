import dotenv from 'dotenv'
import { FormatRegistry, Static, Type } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

// Register URI format validator for TypeBox
FormatRegistry.Set('uri', (value) => {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
})

// Load environment-specific file
dotenv.config({
  path: process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development'
})

const EnvSchema = Type.Object({
  NODE_ENV: Type.Union([
    Type.Literal('development'),
    Type.Literal('production'),
    Type.Literal('test')
  ], { default: 'development' }),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: '0.0.0.0' }),
  DATABASE_URL: Type.String({ minLength: 1 }),
  GOOGLE_CLIENT_ID: Type.String({ minLength: 1 }),
  GOOGLE_CLIENT_SECRET: Type.String({ minLength: 1 }),
  GOOGLE_CALLBACK_URL: Type.String({ format: 'uri' }),
  COOKIE_SECRET: Type.String({ minLength: 1 }),
  APP_URL: Type.String({ format: 'uri' }),
  // JWT Configuration
  JWT_SECRET: Type.String({ minLength: 32 }),
  JWT_ACCESS_EXPIRATION: Type.String({ default: '15m' }),
  JWT_REFRESH_EXPIRATION: Type.String({ default: '7d' }),
  // Redis Configuration
  REDIS_HOST: Type.String({ default: 'localhost' }),
  REDIS_PORT: Type.Number({ default: 6379 }),
  REDIS_PASSWORD: Type.Optional(Type.String()),
  REDIS_DB: Type.Number({ default: 0 }),
  // Session Configuration
  SESSION_MAX_CONCURRENT: Type.Number({ default: 5 }),
  SESSION_STRICT_IP_CHECK: Type.Boolean({ default: false })
})

export type Env = Static<typeof EnvSchema>

const parseEnv = (): Env => {
  // Convert string values to appropriate types
  const rawEnv = {
    ...process.env,
    PORT: process.env.PORT ? Number(process.env.PORT) : undefined,
    REDIS_PORT: process.env.REDIS_PORT ? Number(process.env.REDIS_PORT) : undefined,
    REDIS_DB: process.env.REDIS_DB ? Number(process.env.REDIS_DB) : undefined,
    SESSION_MAX_CONCURRENT: process.env.SESSION_MAX_CONCURRENT ? Number(process.env.SESSION_MAX_CONCURRENT) : undefined,
    SESSION_STRICT_IP_CHECK: process.env.SESSION_STRICT_IP_CHECK === 'true'
  }

  // Apply defaults
  const envWithDefaults = Value.Default(EnvSchema, rawEnv)

  // Validate
  if (!Value.Check(EnvSchema, envWithDefaults)) {
    const errors = [...Value.Errors(EnvSchema, envWithDefaults)]
    console.error('Environment validation failed:')
    errors.forEach((error) => {
      console.error(`  ${error.path}: ${error.message}`)
    })
    throw new Error('Invalid environment configuration')
  }

  return envWithDefaults as Env
}

export const env = parseEnv()
