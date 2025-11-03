# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### Swagger/OpenAPI Documentation
- **Integrated automatic API documentation**: Added Swagger/OpenAPI support for interactive API docs
  - Added `@fastify/swagger` and `@fastify/swagger-ui` dependencies
  - Configured OpenAPI 3.x specification with API metadata
  - Migrated from Zod to TypeBox for all schema validation and documentation
  - Created comprehensive TypeBox schemas in `src/schemas/`
  - Added schema documentation to all API endpoints
  - Interactive documentation available at `/docs` endpoint
  - Support for cookie-based authentication in Swagger UI
  - Created documentation guide in `docs/SWAGGER.md`

**Features:**
- **Interactive Testing**: Test API endpoints directly from the documentation
- **Type-Safe Schemas**: TypeBox provides compile-time type safety
- **Auto-Generated Docs**: Schemas automatically generate request/response examples
- **OpenAPI 3.x**: Modern standard for API documentation
- **Better DX**: Developers can explore and test the API easily

#### TypeBox Migration
- **Completed full migration from Zod to TypeBox**: All validation now uses TypeBox
  - Migrated environment validation in `src/config/env.ts` from Zod to TypeBox
  - Uses `@sinclair/typebox/value` module for runtime validation
  - Replaced `z.object()` with `Type.Object()` for schema definition
  - Replaced `envSchema.parse()` with `Value.Check()` and `Value.Errors()` for validation
  - Updated type inference from `z.infer` to `Static<typeof EnvSchema>`
  - Removed Zod dependency completely from the project

**Benefits:**
- **Single Validation Library**: Consistent validation approach across the entire codebase
- **JSON Schema Native**: TypeBox generates standard JSON Schema for OpenAPI
- **Better Performance**: TypeBox is optimized for speed and has minimal overhead
- **Type Safety**: Full TypeScript type inference and compile-time checking
- **Smaller Bundle**: One less dependency to maintain and ship

### Changed

#### Import Path Simplification
- **Removed `.js` extensions from imports**: Cleaned up TypeScript imports for better readability
  - Removed `.js` extensions from all import statements in source files
  - Changed `~/module/index.js` imports to `~/module` (cleaner module imports)
  - Examples:
    - `from '~/config/index.js'` → `from '~/config'`
    - `from '~/services/index.js'` → `from '~/services'`
    - `from './app.js'` → `from './app'`
  - TypeScript compiler still generates `.js` files with proper CommonJS requires
  - Verified with successful `npm run build` and `npm run lint`

**Benefits:**
- **Cleaner Code**: Less visual clutter in import statements
- **Modern Convention**: Aligns with TypeScript best practices
- **Consistent Style**: All imports follow the same pattern
- **Better DX**: Easier to read and maintain import statements

#### ESLint Configuration Modernization
- **Migrated to @stylistic/eslint-plugin**: Replaced deprecated ESLint stylistic rules with the community-maintained `@stylistic` plugin
  - Added `@stylistic/eslint-plugin` to dependencies
  - Updated `eslint.config.mjs` to use `@stylistic` for all formatting rules
  - **Adopted no-semicolon style**: Changed `@stylistic/semi` from `'always'` to `'never'`
  - Migrated rules:
    - `semi` → `@stylistic/semi` (set to 'never')
    - `quotes` → `@stylistic/quotes`
    - `indent` → `@stylistic/indent`
    - `comma-dangle` → `@stylistic/comma-dangle`
  - Added additional stylistic rules for consistent spacing and formatting
  - Automatically removed semicolons from entire codebase using `npm run lint:fix`
  - Created comprehensive ESLint documentation in `docs/ESLINT.md` and `docs/ESLINT.ru.md`

**Benefits:**
- **Future-proof**: Uses actively maintained stylistic rules instead of deprecated ESLint core rules
- **TypeScript-aware**: Better support for TypeScript-specific formatting
- **Clear Separation**: Logical rules vs. stylistic rules are clearly distinguished
- **Community-driven**: Regular updates and improvements from the community
- **No Prettier needed**: Single tool for both linting and formatting

#### Type System Refactor
- **Consolidated Fastify module augmentations**: All type extensions now in a single file
  - Created `src/types/fastify.d.ts` as the centralized location for all Fastify type extensions
  - Removed duplicate `declare module` statements from:
    - `src/app.ts` (FastifyInstance.googleOAuth2 declaration)
    - `src/middlewares/auth.middleware.ts` (FastifyRequest.userId declaration)
  - Added comprehensive TypeScript documentation in `docs/TYPESCRIPT.md`

**Benefits:**
- **Single Source of Truth**: All Fastify type extensions in one location
- **No Duplication**: Eliminates maintenance overhead from scattered type declarations
- **Better Discoverability**: Easy to find and understand all custom type extensions
- **Improved Maintainability**: Changes to types need to be made in only one place
- **Cleaner Code**: Source files focus on logic, not type declarations

## [1.0.0] - Initial Release

### Added
- TypeScript + Fastify + PostgreSQL + Drizzle ORM starter project
- Google OAuth 2.0 authentication
- Repository pattern for database access
- Layered architecture (routes → services → repositories → database)
- Docker support for development and production
- Environment-based configuration
- Comprehensive documentation in English and Russian
