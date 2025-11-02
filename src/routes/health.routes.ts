import { Type } from '@sinclair/typebox'
import { FastifyInstance } from 'fastify'
import { sql } from 'drizzle-orm'

import { db } from '~/db'

const HealthResponseSchema = Type.Object({
  status: Type.String({ description: 'Service status' }),
  timestamp: Type.String({ format: 'date-time', description: 'Current timestamp' }),
  database: Type.Object({
    connected: Type.Boolean({ description: 'Database connection status' }),
    latency: Type.Optional(Type.Number({ description: 'Database query latency in ms' })),
    error: Type.Optional(Type.String({ description: 'Database error message' }))
  })
}, {
  $id: 'HealthResponse',
  description: 'Health check response'
})

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Check API and database health status',
      response: {
        200: HealthResponseSchema
      }
    }
  }, async () => {
    const timestamp = new Date().toISOString()
    let dbStatus = {
      connected: false,
      latency: undefined as number | undefined,
      error: undefined as string | undefined
    }

    try {
      const startTime = Date.now()

      // Simple database query to check connection
      await db.execute(sql`SELECT 1`)

      const endTime = Date.now()
      dbStatus = {
        connected: true,
        latency: endTime - startTime,
        error: undefined
      }
    } catch (error) {
      dbStatus = {
        connected: false,
        latency: undefined,
        error: error instanceof Error ? error.message : 'Unknown database error'
      }
    }

    return {
      status: dbStatus.connected ? 'ok' : 'degraded',
      timestamp,
      database: dbStatus
    }
  })

  fastify.get('/health/db', {
    schema: {
      tags: ['health'],
      description: 'Check database connection only',
      response: {
        200: Type.Object({
          connected: Type.Boolean(),
          latency: Type.Optional(Type.Number()),
          timestamp: Type.String()
        }),
        503: Type.Object({
          connected: Type.Boolean(),
          error: Type.Optional(Type.String()),
          timestamp: Type.String()
        })
      }
    }
  }, async (_, reply) => {
    try {
      const startTime = Date.now()
      await db.execute(sql`SELECT 1`)
      const endTime = Date.now()

      return {
        connected: true,
        latency: endTime - startTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      reply.code(503)
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  })
}
