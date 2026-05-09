# Commander Admin Panel — Coding Guidelines

## Overview

This document defines coding standards for the Commander project, a React 19 + TypeScript admin panel built with Vite, Ant Design, Zustand, and React Router 7.

**Core Principles:**
- **Type Safety First**: TypeScript strict mode everywhere, no `any`
- **Clarity Over Cleverness**: Readable code beats clever code
- **Fail Fast**: Validate at boundaries, surface errors early
- **Single Responsibility**: Each component/hook/util does one thing

---

## 1. TypeScript Standards

### 1.1 Type Definitions

Prefer explicit types over inference for component props and API boundaries:

```typescript
// Good
interface UserListProps {
  userId: string;
  onSelect: (id: string) => void;
}

// Avoid
interface UserListProps {
  userId;         // Missing type
  onSelect: any;  // Too broad
}
```

Use discriminated unions for async state:

```typescript
// Good
type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

// Avoid — related fields aren't guaranteed
interface AsyncState<T> {
  loading: boolean;
  data?: T;     // When is this defined?
  error?: string;
}
```

Use `Record<K, V>` for dynamic key-value structures:

```typescript
// Good
type FilterParams = Record<string, unknown>;

// API params map
const TOKEN_KEY: Record<AppName, string> = {
  mandis: 'mandis_admin_token',
  begreat: 'begreat_admin_token',
};
```

### 1.2 Strict Mode Compliance

All code must compile with `strict: true`:

```typescript
// Required in tsconfig.app.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

Handle nullable values explicitly:

```typescript
// Good
const token = res.data?.token ?? '';

// Avoid
const token = res.data.token;  // Could be undefined!
```

### 1.3 Avoid `any`

Use `unknown` or generics instead:

```typescript
// Good
function parseApiResponse<T>(data: unknown): T {
  if (!isValidResponse(data)) throw new Error('Invalid response shape');
  return data as T;
}

// Avoid
function parseApiResponse(data: any) { return data; }
```

**Exception:** Use `// eslint-disable-next-line @typescript-eslint/no-explicit-any` only for third-party library compatibility — add a comment explaining why.

---

## 2. Project Architecture

### 2.1 Directory Structure

```
src/
├── api/               # Axios client + API modules
│   ├── client.ts      # Axios instance with interceptors
│   ├── adminApi.ts    # begreat admin endpoints
│   └── {app}Api.ts    # Per-app API modules
├── app-modules/       # Per-app feature modules
│   ├── begreat/       # Begreat admin pages
│   └── mandis/        # Mandis admin pages
├── components/        # Shared UI components
│   └── layout/        # Layout components
├── config/            # Static configuration (theme, panels)
├── pages/             # Top-level route pages
├── router.tsx         # React Router configuration
├── store/             # Zustand global state
└── utils/             # Pure utility functions
```

**Rules:**
- `api/`: Only HTTP calls; no business logic, no UI side-effects
- `components/`: Presentational and shared UI only; no direct API calls
- `store/`: Global state; call API functions from store actions
- `utils/`: Pure functions with no side effects
- `pages/` & `app-modules/`: Feature-specific logic; avoid cross-module imports

### 2.2 API Layer

Group endpoints by domain in `src/api/`:

```typescript
// api/adminApi.ts
import { http } from './client';

export const usersApi = {
  list: (params: Record<string, unknown>) =>
    http.get('/begreat-admin/users', { params }),
  detail: (openId: string) =>
    http.get(`/begreat-admin/users/${openId}`),
};
```

**Rules:**
- Never call `http` directly inside components or pages — always through an API module
- Use `Record<string, unknown>` for flexible query params
- Keep each API module focused on one domain

### 2.3 State Management (Zustand)

One store per domain:

```typescript
// store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,

      login: async (username, password) => {
        const res = await authApi.login(username, password);
        set({ token: res.data.token });
      },

      logout: () => {
        set({ token: null });
      },
    }),
    { name: 'commander-auth' },
  ),
);
```

**Rules:**
- Use `persist` middleware only for data that must survive page refresh (auth tokens)
- Store state, actions, and derived selectors in the same store file
- Keep stores focused — split by domain, not by component

### 2.4 Component Design

Prefer functional components with explicit props interfaces:

```typescript
// Good
interface StatCardProps {
  title: string;
  value: number;
  trend?: 'up' | 'down';
}

export function StatCard({ title, value, trend }: StatCardProps) {
  return (
    <Card>
      <Statistic title={title} value={value} />
      {trend && <TrendIndicator direction={trend} />}
    </Card>
  );
}

// Avoid — anonymous export, no prop types
export default ({ title, value }: any) => <Card>...</Card>;
```

---

## 3. Code Style

### 3.1 Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Interfaces | `I` prefix (optional for local) | `IAdminInfo`, `AuthState` |
| Enums | `E` prefix | `EUserRole` |
| Types | PascalCase | `AsyncState`, `AppName` |
| Components | PascalCase | `UserListPage`, `StatCard` |
| Hooks | `use` prefix | `useAuthStore`, `useTableData` |
| Functions | camelCase | `formatDate`, `parseError` |
| Constants | UPPER_SNAKE_CASE | `TOKEN_KEY`, `MAX_PAGE_SIZE` |
| Files (component) | PascalCase | `UserListPage.tsx` |
| Files (util/api) | camelCase | `adminApi.ts`, `bi.ts` |

### 3.2 File Organization

Order within files:

```typescript
// 1. Imports (external, then internal — use @/ alias)
import { useState } from 'react';
import { Table, Button } from 'antd';
import { usersApi } from '@/api/adminApi';
import { useAuthStore } from '@/store/authStore';

// 2. Types / Interfaces
interface UserRow {
  openId: string;
  nickname: string;
  createdAt: string;
}

// 3. Constants
const PAGE_SIZE = 20;

// 4. Helper functions (private, not exported)
function formatUser(raw: unknown): UserRow { ... }

// 5. Main component / exported function
export function UserListPage() { ... }
```

### 3.3 Formatting

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 120,
  "tabWidth": 2,
  "semi": true
}
```

**Manual rules:**
- Max line length: 120 characters
- Indentation: 2 spaces, no tabs
- Single quotes for strings; double quotes only inside JSX attributes when the value contains a single quote

---

## 4. React Patterns

### 4.1 Hooks

Extract reusable logic into custom hooks:

```typescript
// hooks/useTableData.ts
export function useTableData<T>(
  fetcher: (params: Record<string, unknown>) => Promise<{ data: { list: T[]; total: number } }>,
) {
  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async (params: Record<string, unknown>) => {
    setLoading(true);
    try {
      const res = await fetcher(params);
      setData(res.data.list);
      setTotal(res.data.total);
    } catch (err) {
      message.error(parseError(err));
    } finally {
      setLoading(false);
    }
  };

  return { data, total, loading, load };
}
```

**Rules:**
- Keep hooks pure: no direct DOM manipulation unless using `useRef`
- Prefer `useCallback`/`useMemo` only when there is a measurable performance need — don't premature-optimize

### 4.2 Async in Components

Always handle loading and error states:

```typescript
// Good
export function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    dashboardApi.stats()
      .then(res => setStats(res.data))
      .catch(err => message.error(parseError(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin />;
  if (!stats) return <Empty />;

  return <StatsView data={stats} />;
}

// Avoid — unhandled async, no loading state
useEffect(() => {
  dashboardApi.stats().then(res => setStats(res.data));
}, []);
```

### 4.3 Lists and Tables

Always provide `rowKey` for Ant Design `Table`:

```tsx
// Good
<Table
  dataSource={users}
  rowKey="openId"
  columns={columns}
  pagination={{ pageSize: PAGE_SIZE, total }}
/>

// Avoid — rowKey defaults to index, breaks updates
<Table dataSource={users} columns={columns} />
```

---

## 5. Error Handling

### 5.1 API Error Pattern

Centralize error parsing:

```typescript
// utils/error.ts
export function parseError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
```

Use in components:

```typescript
try {
  await sessionsApi.grant(sessionId, reason);
  message.success('Granted');
} catch (err) {
  message.error(parseError(err));
}
```

### 5.2 Axios Interceptors

Handle auth and common errors in one place:

```typescript
// api/client.ts
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().clearAuth();
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);
```

### 5.3 Error Boundaries

Wrap page-level routes with `ErrorBoundary`:

```tsx
// router.tsx
<Route path="/users" element={
  <ErrorBoundary>
    <UserListPage />
  </ErrorBoundary>
} />
```

---

## 6. Validation

Use Ant Design Form built-in rules for user input; add custom validators for complex logic:

```typescript
const rules: Rule[] = [
  { required: true, message: 'Required' },
  { min: 3, message: 'At least 3 characters' },
  {
    validator: async (_, value) => {
      if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
        throw new Error('Only letters, digits, and underscores');
      }
    },
  },
];
```

---

## 7. Security

### 7.1 Token Management

Never store tokens in code or commit `.env` files:

```typescript
// Good — from environment
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Avoid — hardcoded
const API_BASE = 'https://api.example.com';
```

Store tokens in `localStorage` via Zustand `persist` — never in component state or global variables.

### 7.2 XSS Prevention

Never use `dangerouslySetInnerHTML` unless the content is sanitized and the reason is documented.

---

## 8. Performance

### 8.1 Lazy Loading Routes

Use `React.lazy` for heavy pages:

```typescript
// router.tsx
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const UserListPage = lazy(() => import('@/app-modules/begreat/UserListPage'));

// Wrap in Suspense
<Suspense fallback={<Spin />}>
  <Routes>...</Routes>
</Suspense>
```

### 8.2 Parallel Data Fetching

Use `Promise.all` for independent API calls:

```typescript
// Good
const [stats, trend] = await Promise.all([
  dashboardApi.stats(),
  dashboardApi.trend(7),
]);

// Avoid — sequential, slow
const stats = await dashboardApi.stats();
const trend = await dashboardApi.trend(7);
```

### 8.3 Pagination

Always paginate table data; never fetch unbounded lists:

```typescript
const MAX_PAGE_SIZE = 50;

const res = await usersApi.list({ page, pageSize: MAX_PAGE_SIZE });
```

---

## 9. Git Workflow

### 9.1 Commit Messages

Follow conventional commits:

```
type(scope): subject
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Refactoring (no functional change)
- `style`: Code formatting only
- `docs`: Documentation
- `chore`: Build, deps, tooling

**Examples:**

```
feat(users): add timeline drawer for user detail
fix(auth): redirect to login on 401 response
refactor(dashboard): extract StatCard into shared component
```

### 9.2 Branch Naming

```
feature/add-payment-anomaly-fix
bugfix/fix-auth-redirect-loop
refactor/extract-table-hook
```

---

## 10. Checklist for New Features

Before submitting code:

- [ ] TypeScript compiles with no errors (`npm run build`)
- [ ] No `any` types (or exceptions are documented)
- [ ] Loading and error states handled in all async paths
- [ ] `rowKey` set on all `Table` components
- [ ] No hardcoded API URLs or secrets
- [ ] New constants defined with UPPER_SNAKE_CASE and a comment
- [ ] Functions ≤ 40 lines; no nesting deeper than 3 levels
- [ ] No magic numbers/strings — use named constants
- [ ] Routes lazy-loaded for heavy pages
- [ ] Commit message follows conventional format

---

## 11. Resources

- [React 19 Docs](https://react.dev/)
- [Ant Design 5 Components](https://ant.design/components/overview/)
- [Zustand Docs](https://zustand.docs.pmnd.rs/)
- [React Router 7 Docs](https://reactrouter.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)

---

**Questions or suggestions?** Discuss with the team or open an issue.
