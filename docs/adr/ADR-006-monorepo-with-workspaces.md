# ADR-006: Monorepo with npm Workspaces

## Status
Accepted

## Context
The project has two deployable units: a React frontend and an Express backend. They share TypeScript types (WebRTC, signaling payloads, protocol definitions). A common codebase structure is needed to:
- Share types and utilities between frontend and backend
- Unify linting and formatting configuration
- Enable single-command development startup
- Maintain consistent dependency versions

## Decision
Use npm workspaces with a monorepo structure containing `packages/client` and `packages/server`.

## Consequences

### Positive
- Shared `@p2p-share/types` package for protocol types
- Single `npm install` at root installs all dependencies
- Unified ESLint, Prettier, TypeScript configs
- `npm run dev` at root starts both frontend and backend concurrently
- No additional tooling (Turborepo, Nx) needed for this scale

### Negative
- npm workspaces hoist dependencies, which can cause version conflicts
- All packages get the same ESLint config (workaround: per-package overrides)
- Not suitable for very large monorepos (but appropriate for 2 packages)

## Alternatives Considered
- **Separate repositories**: More complex CI/CD, no shared types without publishing a package.
- **Single package (no separation)**: Code co-location leads to blurred boundaries and harder deployment.
- **Turborepo/Nx**: Adds complexity and learning curve for a 2-package project.
- **Yarn workspaces / pnpm workspaces**: Similar to npm workspaces; npm chosen for zero additional tooling.

## Related
- Project Structure: Defined in `IMPLEMENTATION_PLAN.md`
