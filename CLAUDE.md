# Commander Admin Panel

## Project Overview

React 19 + TypeScript admin panel for managing Mindful Art Studio backend services. Built with Vite, Ant Design, Zustand, and React Router 7. Supports two apps: **begreat** and **mandis**, each with independent auth tokens.

## Tech Stack

| Layer | Library |
|-------|---------|
| UI Framework | React 19 + Vite |
| Component Library | Ant Design 6 |
| State Management | Zustand (with persist middleware) |
| Routing | React Router 7 |
| HTTP Client | Axios |
| Language | TypeScript (strict) |

## Development Workflow

### MANDATORY: Before Any Coding Task

**Before starting ANY coding task, you MUST invoke the karpathy-guidelines skill:**

```
/karpathy-guidelines
```

This ensures code quality checks and helps avoid common mistakes (overcomplication, unsafe changes, missing success criteria).

### Coding Standards

Follow **`CODING_GUIDELINES.md`** in this directory for all code. Key rules:

- Single quotes, 2-space indent, 120-char max line length
- No `any` types — use `unknown` or generics
- `camelCase` for variables/functions, `PascalCase` for components/types
- `UPPER_SNAKE_CASE` for constants (with a comment explaining meaning)
- Functions ≤ 40 lines; nesting ≤ 3 levels
- No magic numbers/strings — define named constants

### Directory Structure

```
src/
├── api/            # Axios client + per-domain API modules
├── app-modules/    # Per-app feature pages (begreat/, mandis/)
├── components/     # Shared UI components
├── config/         # Static config (theme, panels)
├── pages/          # Top-level route pages
├── router.tsx      # React Router config
├── store/          # Zustand stores
└── utils/          # Pure utility functions
```

### Auth Architecture

Dual-token system: begreat and mandis each have independent JWT tokens stored in `localStorage` under separate keys. Managed via `useAuthStore` (Zustand + persist). Axios interceptors handle 401 → redirect to login.

## Deployment

```bash
../deploy.sh commander "feat(scope): describe the change"
```

The script builds locally, synchronizes source through Git, uploads `dist`, publishes `index.html` last, and verifies
the live page. The static directory is bind-mounted into Nginx, so frontend deployments do not restart Docker.

**Note:** commander has a single `master` branch — no release merge is needed.
