# Project Rules

## Project Structure

This is a monorepo with the following structure:

- **`apps/web/`** - Frontend application (React with TanStack Router)

- **`apps/server/`** - Backend server (Hono)

- **`packages/api/`** - Shared API logic and types
- **`packages/auth/`** - Authentication logic and utilities
- **`packages/db/`** - Database schema and utilities
- **`packages/env/`** - Shared environment variables and validation
- **`packages/config/`** - Shared TypeScript configuration
- **`packages/infra/`** - Infrastructure as code (Alchemy for Cloudflare)

## Available Scripts

- `bun run dev` - Start all apps in development mode
- `bun run dev:web` - Start only the web app
- `bun run dev:server` - Start only the server
- `bun run build` - Build all apps
- `bun run lint` - Lint all packages
- `bun run typecheck` - Type check all packages

## Database Commands

All database operations should be run from the server workspace:

- `bun run db:push` - Push schema changes to database
- `bun run db:studio` - Open database studio
- `bun run db:generate` - Generate Drizzle files
- `bun run db:migrate` - Run database migrations

Database schema files are located in `packages/db/src/schema/`

## API Structure

- oRPC contracts and routers are in `packages/api/src/`
- Client-side oRPC client is in `apps/web/src/utils/orpc.ts`

## Authentication

Authentication is powered by Better Auth:

- Auth configuration is in `packages/auth/src/`
- Web app auth client is in `apps/web/src/lib/auth-client.ts`

## Project Configuration

This project includes a `bts.jsonc` configuration file that stores your Better-T-Stack settings:

- Contains your selected stack configuration (database, ORM, backend, frontend, etc.)
- Used by the CLI to understand your project structure
- Safe to delete if not needed

## Skills

This project has skills available in `.claude/skills/` (symlinked from `.agents/skills/`). **You must invoke the relevant skill before starting work** when the task matches a skill's domain. Use the `Skill` tool to invoke them.

| Skill | When to Use |
|-------|-------------|
| **tanstack-router** | Implementing routes, file-based routing, route loaders, navigation, or troubleshooting routing issues in `apps/web/` |
| **hono** | Building or modifying API endpoints, middleware, or server logic in `apps/server/` |
| **better-auth-best-practices** | Working on authentication — login, signup, sessions, OAuth, or anything in `packages/auth/` |
| **turborepo** | Modifying `turbo.json`, task pipelines, adding packages, caching, CI config, or monorepo structure |
| **vercel-react-best-practices** | Writing, reviewing, or refactoring React components — covers performance, re-renders, bundle size, data fetching |
| **vercel-composition-patterns** | Refactoring components with many boolean props, building compound components, designing reusable component APIs |
| **web-design-guidelines** | Reviewing UI for accessibility, UX quality, or web interface best practices |

## Key Points

- This is a Turborepo monorepo using bun workspaces
- Each app has its own `package.json` and dependencies
- Run commands from the root to execute across all workspaces
- Run workspace-specific commands with `bun run command-name`
- Turborepo handles build caching and parallel execution
