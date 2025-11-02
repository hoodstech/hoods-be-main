import fastify from 'fastify'
import fastifyCookie from '@fastify/cookie'
import fastifyCors from '@fastify/cors'
import fastifyOAuth2 from '@fastify/oauth2'
import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'

import { env, googleOAuthOptions } from '~/config'
import { db } from '~/db'
import { UserRepository } from '~/repositories'
import { authRoutes, healthRoutes } from '~/routes'
import { AuthService } from '~/services'

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
        { name: 'health', description: 'Health check endpoints' }
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
      deepLinking: true
    },
    staticCSP: true
  })

  // Register plugins
  await app.register(fastifyCors, {
    origin: env.APP_URL,
    credentials: true
  })

  await app.register(fastifyCookie, {
    secret: env.COOKIE_SECRET
  })

  await app.register(fastifyOAuth2, googleOAuthOptions)

  // Initialize repositories and services
  const userRepository = new UserRepository(db)
  const authService = new AuthService(userRepository)

  // Register routes
  await healthRoutes(app)
  await authRoutes(app, authService)

  return app
}
