#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const ENV_FILE = process.argv[2] || '.env.development'

console.log(`🔍 Checking environment variables in ${ENV_FILE}...`)

// Check if .env file exists
if (!fs.existsSync(ENV_FILE)) {
  console.error(`❌ Error: ${ENV_FILE} file not found!`)
  console.error('Please copy .env.development or .env.production and configure it.')
  process.exit(1)
}

// Read and parse .env file
const envContent = fs.readFileSync(ENV_FILE, 'utf8')
const envVars = {}

envContent.split('\n').forEach((line) => {
  line = line.trim()

  // Skip empty lines and comments
  if (!line || line.startsWith('#')) {
    return
  }

  // Parse KEY=VALUE
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    const key = match[1].trim()
    const value = match[2].trim()
    envVars[key] = value
  }
})

// Required variables
const REQUIRED_VARS = [
  'POSTGRES_USER',
  'POSTGRES_PASSWORD',
  'POSTGRES_DB',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
  'ADMIN_NAME',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_CALLBACK_URL',
  'COOKIE_SECRET',
  'APP_URL'
]

const missingVars = []

// Check each required variable
REQUIRED_VARS.forEach((varName) => {
  if (!envVars[varName] || envVars[varName] === '') {
    missingVars.push(varName)
  }
})

// Report results
if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set!')
  process.exit(0)
} else {
  console.error('❌ Error: The following required environment variables are missing or empty:')
  missingVars.forEach((varName) => {
    console.error(`  - ${varName}`)
  })
  console.error('')
  console.error(`Please set these variables in ${ENV_FILE}`)
  process.exit(1)
}
