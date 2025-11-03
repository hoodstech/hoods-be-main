import { buildApp } from './app'
import { env } from './config'

async function start() {
  try {
    const app = await buildApp()

    await app.listen({
      port: env.PORT,
      host: env.HOST
    })

    console.log(`Server is running on ${env.APP_URL}`)
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
