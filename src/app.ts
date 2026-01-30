import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyHelmet from '@fastify/helmet'
import fastifyJWT from '@fastify/jwt'
import fastifyOAuth2 from '@fastify/oauth2'
import fastifyRateLimit from '@fastify/rate-limit'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { env, googleOAuthOptions, jwtConfig } from '~/config'
import { setupContainer } from '~/container'
import { authRoutes, buyerRoutes, healthRoutes, sellerRoutes } from '~/routes'

export async function buildApp() {
  const app = fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug'
    }
  }).withTypeProvider<TypeBoxTypeProvider>()

  // Register Swagger documentation
  await app.register(fastifySwagger, {
    openapi: {
      info: {
        title: 'Hoods API',
        description: 'Backend API with Fastify, PostgreSQL, and Drizzle ORM',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          url: 'https://github.com/hoodstech'
        },
        license: {
          name: 'ISC'
        }
      },
      servers: [
        {
          url: env.APP_URL,
          description: env.NODE_ENV === 'production' ? 'Production' : 'Development'
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'health', description: 'Health check endpoints' },
        { name: 'seller', description: 'Seller endpoints for managing items and tags' },
        { name: 'buyer', description: 'Buyer endpoints for feed and interactions' }
      ],
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'user_id',
            description: 'Session cookie authentication'
          }
        }
      }
    }
  })

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      withCredentials: true
    },
    staticCSP: true
  })

  // Register security plugins
  // Helmet must be registered before other plugins
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ['\'self\''],
        styleSrc: ['\'self\'', '\'unsafe-inline\''],
        scriptSrc: ['\'self\''],
        imgSrc: ['\'self\'', 'data:', 'https:'],
        connectSrc: ['\'self\''],
        fontSrc: ['\'self\''],
        objectSrc: ['\'none\''],
        mediaSrc: ['\'self\''],
        frameSrc: ['\'none\'']
      }
    },
    crossOriginEmbedderPolicy: env.NODE_ENV === 'production',
    crossOriginOpenerPolicy: { policy: 'same-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
    dnsPrefetchControl: { allow: false },
    frameguard: { action: 'deny' },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: { permittedPolicies: 'none' },
    referrerPolicy: { policy: 'no-referrer' },
    xssFilter: true
  })

  await app.register(fastifyCors, {
    origin: env.APP_URL,
    credentials: true
  })

  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET
  })

  // Register JWT
  await app.register(fastifyJWT, jwtConfig)

  // Register global rate limiting
  await app.register(fastifyRateLimit, {
    global: true,
    max: 100, // Maximum 100 requests
    timeWindow: '15 minutes', // Per 15 minutes
    cache: 10000, // Cache size
    allowList: ['127.0.0.1'], // Whitelist localhost for development
    skipOnError: false,
    ban: 5, // Ban after 5 successive errors
    continueExceeding: false,
    enableDraftSpec: true,
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true
    }
  })

  await app.register(fastifyOAuth2, googleOAuthOptions)

  // Setup dependency injection container
  const container = setupContainer()

  // Register routes with DI container and v1 prefix
  await app.register(async (instance) => {
    await healthRoutes(instance, container)
    await authRoutes(instance, container)
    await sellerRoutes(instance, container)
    await buyerRoutes(instance, container)
  }, { prefix: '/v1' })

  return app
}
