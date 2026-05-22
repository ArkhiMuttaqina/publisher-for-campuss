---
name: hm-react-frontend
description: Use when building React frontend features, defining component architecture, managing state, integrating API clients, or setting up React app conventions with TypeScript.
---

# React Frontend

## Overview

Frontend React should prioritize predictable data flow, reusable UI composition, and clear separation between presentation, state, and network concerns.

Core principle: Components render UI, hooks orchestrate state/side effects, and API clients handle HTTP access. Avoid placing fetch logic and business rules directly inside view components.

## Use this skill when

- creating or refactoring React pages/components
- designing frontend folder structure
- integrating frontend with backend REST API
- deciding state management approach (local, context, server state)
- adding form handling and validation in React

## 1. Recommended React project layout

```text
apps/web/
├── src/
│   ├── app/
│   │   ├── router.tsx                # Route definitions
│   │   ├── providers.tsx             # Global providers (QueryClient, Theme, etc.)
│   │   └── index.tsx                 # App root
│   ├── pages/
│   │   ├── dashboard/
│   │   │   ├── dashboard.page.tsx
│   │   │   └── dashboard.loader.ts
│   │   └── users/
│   │       ├── users.page.tsx
│   │       └── users.loader.ts
│   ├── features/
│   │   └── user/
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       ├── schemas/
│   │       └── types/
│   ├── shared/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── constants/
│   │   └── styles/
│   └── main.tsx
├── public/
├── vite.config.ts
└── tsconfig.json
```

Guideline:

- `pages/` for route-level UI
- `features/` for domain-specific units (user, auth, order)
- `shared/` for reusable cross-feature code
- Keep components small and focused on rendering

## 2. Component design rules

- Prefer functional components with TypeScript props types
- Keep presentational components stateless where possible
- Move side effects (`useEffect`) to feature hooks
- Do not call backend directly in deeply nested UI components
- Compose UI from small reusable units instead of one large component

Example split:

```typescript
// features/user/components/user-list.tsx
type UserListProps = {
  users: Array<{ id: string; name: string; email: string }>;
  isLoading?: boolean;
};

export function UserList({ users, isLoading = false }: UserListProps) {
  if (isLoading) return <p>Loading users...</p>;
  if (users.length === 0) return <p>No users found.</p>;

  return (
    <ul>
      {users.map((user) => (
        <li key={user.id}>{user.name} ({user.email})</li>
      ))}
    </ul>
  );
}
```

## 3. Data fetching and server state

Use a dedicated server-state library for async data lifecycle (loading, cache, revalidation, retries).

Recommended approach:

- Use TanStack Query for server state
- Keep API access inside `services/` modules
- Use feature hooks to bridge query + component

```typescript
// features/user/services/user.api.ts
import { httpClient } from "@/shared/lib/http-client";

export async function getUsers() {
  const response = await httpClient.get("/api/users");
  return response.data;
}
```

```typescript
// features/user/hooks/use-users.ts
import { useQuery } from "@tanstack/react-query";
import { getUsers } from "../services/user.api";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: getUsers,
    staleTime: 60_000,
  });
}
```

Benefits:

- Consistent loading/error state
- Built-in request deduplication and caching
- Better user experience with automatic refetch patterns

## 4. Forms and validation

Use schema-first validation to keep form rules consistent with backend contracts.

Recommended stack:

- `react-hook-form` for form state
- `zod` for schema validation
- `@hookform/resolvers/zod` for resolver integration

```typescript
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
});

type CreateUserInput = z.infer<typeof createUserSchema>;

export function useCreateUserForm() {
  return useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { name: "", email: "" },
  });
}
```

## 5. API integration conventions

- Read API base URL from env (`VITE_API_BASE_URL`)
- Centralize HTTP client config (headers, auth token, interceptors)
- Normalize API error shape into UI-friendly messages
- Keep DTO mapping in service layer, not component layer

Example env:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

## 6. Performance baseline

- Use route-level code splitting (`lazy`, dynamic import)
- Memoize only when needed (`React.memo`, `useMemo`, `useCallback`)
- Virtualize long lists
- Avoid unnecessary context re-renders by splitting providers

## 7. Testing strategy

- Unit test pure utility and hook logic
- Component test user behavior with React Testing Library
- Mock API at network level (MSW) for realistic interaction
- Keep E2E flow tests for critical journeys (login, checkout, publish)

## References

- [React Docs](https://react.dev/learn) — React Team
- [TanStack Query Docs](https://tanstack.com/query/latest/docs/framework/react/overview) — TanStack
- [React Hook Form Docs](https://react-hook-form.com/) — React Hook Form
- [Zod Docs](https://zod.dev/) — Zod
- [Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/) — Testing Library
