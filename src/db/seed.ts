import * as argon2 from 'argon2'
import { drizzle } from 'drizzle-orm/postgres-js'
import { eq } from 'drizzle-orm'
import postgres from 'postgres'

import * as schema from './schemas/index'
import { users } from './schemas/users.schema'

// Create a dedicated connection for seeding that we can close
const connectionString = process.env.DATABASE_URL || ''
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined')
}

const client = postgres(connectionString, { max: 1 })
const db = drizzle(client, { schema })

interface AdminCredentials {
  email: string
  password: string
  name?: string
}

async function getAdminCredentials(): Promise<AdminCredentials> {
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD

  if (!password) {
    throw new Error('ADMIN_PASSWORD environment variable is required')
  }

  return {
    email,
    password,
    name: process.env.ADMIN_NAME || 'Admin User'
  }
}

async function seedAdmin() {
  try {
    console.log('🌱 Starting admin user seed...')

    const credentials = await getAdminCredentials()

    // Check if admin already exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, credentials.email))
      .limit(1)

    if (existingAdmin.length > 0) {
      console.log('✅ Admin user already exists:', credentials.email)

      // Update password if needed
      const hashedPassword = await argon2.hash(credentials.password, {
        type: argon2.argon2id,
        memoryCost: 65536, // 64 MiB
        timeCost: 3,
        parallelism: 4
      })

      await db
        .update(users)
        .set({
          password: hashedPassword,
          name: credentials.name,
          updatedAt: new Date()
        })
        .where(eq(users.email, credentials.email))

      console.log('✅ Admin user credentials updated')
      await client.end()
      console.log('🔌 Database connection closed')
      return
    }

    // Hash password with Argon2
    console.log('🔐 Hashing admin password with Argon2...')
    const hashedPassword = await argon2.hash(credentials.password, {
      type: argon2.argon2id,
      memoryCost: 65536, // 64 MiB
      timeCost: 3,
      parallelism: 4
    })

    // Create admin user
    console.log('👤 Creating admin user...')
    await db.insert(users).values({
      email: credentials.email,
      password: hashedPassword,
      name: credentials.name,
      emailVerified: true,
      role: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    })

    console.log('✅ Admin user created successfully:', credentials.email)
  } catch (error) {
    console.error('❌ Error seeding admin user:', error)
    await client.end()
    process.exit(1)
  }

  // Close the database connection
  await client.end()
  console.log('🔌 Database connection closed')
}

// Run seed
seedAdmin()
