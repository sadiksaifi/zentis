# Whiteboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a personal sketching whiteboard using embedded Excalidraw with TanStack DB persistence and a Google Docs-style board list home page.

**Architecture:** Embed `@excalidraw/excalidraw` as a React component in the existing TanStack Router app. Board data (elements, appState, files) stored as JSON in a D1 SQLite table via Drizzle. TanStack DB provides optimistic client-side state with automatic server sync through oRPC endpoints.

**Tech Stack:** Excalidraw, TanStack DB (`@tanstack/db`, `@tanstack/react-db`), oRPC, Drizzle ORM, Zod v4, nanoid

**Design doc:** `docs/plans/2026-02-16-whiteboard-design.md`

---

### Task 1: Add Board Database Schema

**Files:**
- Create: `packages/db/src/schema/board.ts`
- Modify: `packages/db/src/schema/index.ts`

**Step 1: Create the board schema file**

Create `packages/db/src/schema/board.ts`:

```typescript
import { relations, sql } from "drizzle-orm";
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

export const board = sqliteTable(
  "board",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Untitled"),
    elements: text("elements").notNull().default("[]"),
    appState: text("app_state").notNull().default("{}"),
    files: text("files"),
    thumbnailDataUrl: text("thumbnail_data_url"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [index("board_userId_idx").on(table.userId)],
);

export const boardRelations = relations(board, ({ one }) => ({
  user: one(user, {
    fields: [board.userId],
    references: [user.id],
  }),
}));
```

**Step 2: Export from schema index**

Modify `packages/db/src/schema/index.ts` — add the board export:

```typescript
export * from "./auth";
export * from "./board";
export {};
```

**Step 3: Push schema to database**

Run: `bun run db:push`
Expected: Schema pushed successfully, new `board` table created.

**Step 4: Commit**

```bash
git add packages/db/src/schema/board.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add board table schema"
```

---

### Task 2: Install Backend Dependencies

**Files:**
- Modify: `packages/api/package.json`

**Step 1: Add nanoid to the API package**

Run from project root:
```bash
cd packages/api && bun add nanoid
```

**Step 2: Verify installation**

Run: `bun install` (from root)
Expected: Lock file updated, no errors.

**Step 3: Commit**

```bash
git add packages/api/package.json bun.lock
git commit -m "chore(api): add nanoid dependency"
```

---

### Task 3: Add Board oRPC Router

**Files:**
- Create: `packages/api/src/routers/board.ts`
- Modify: `packages/api/src/routers/index.ts`

**Step 1: Create the board router**

Create `packages/api/src/routers/board.ts`:

```typescript
import { ORPCError } from "@orpc/server";
import { db } from "@zentis/db";
import { board } from "@zentis/db/schema/board";
import { nanoid } from "nanoid";
import { desc, eq, and } from "drizzle-orm";
import * as z from "zod";
import { protectedProcedure } from "../index";

export const boardRouter = {
  list: protectedProcedure.handler(async ({ context }) => {
    const boards = await db
      .select({
        id: board.id,
        title: board.title,
        thumbnailDataUrl: board.thumbnailDataUrl,
        createdAt: board.createdAt,
        updatedAt: board.updatedAt,
      })
      .from(board)
      .where(eq(board.userId, context.session.user.id))
      .orderBy(desc(board.updatedAt));
    return boards;
  }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      const [found] = await db
        .select()
        .from(board)
        .where(
          and(eq(board.id, input.id), eq(board.userId, context.session.user.id)),
        );
      if (!found) {
        throw new ORPCError("NOT_FOUND", { message: "Board not found" });
      }
      return found;
    }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const id = nanoid();
      const now = new Date();
      await db.insert(board).values({
        id,
        userId: context.session.user.id,
        title: input.title ?? "Untitled",
        elements: "[]",
        appState: "{}",
        createdAt: now,
        updatedAt: now,
      });
      return { id };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        elements: z.string().optional(),
        appState: z.string().optional(),
        files: z.string().nullable().optional(),
        thumbnailDataUrl: z.string().nullable().optional(),
      }),
    )
    .handler(async ({ input, context }) => {
      const { id, ...updates } = input;
      // Only include fields that were actually provided
      const setFields: Record<string, unknown> = {};
      if (updates.title !== undefined) setFields.title = updates.title;
      if (updates.elements !== undefined) setFields.elements = updates.elements;
      if (updates.appState !== undefined) setFields.appState = updates.appState;
      if (updates.files !== undefined) setFields.files = updates.files;
      if (updates.thumbnailDataUrl !== undefined)
        setFields.thumbnailDataUrl = updates.thumbnailDataUrl;

      if (Object.keys(setFields).length === 0) return { success: true };

      const result = await db
        .update(board)
        .set(setFields)
        .where(
          and(eq(board.id, id), eq(board.userId, context.session.user.id)),
        );
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .handler(async ({ input, context }) => {
      await db
        .delete(board)
        .where(
          and(
            eq(board.id, input.id),
            eq(board.userId, context.session.user.id),
          ),
        );
      return { success: true };
    }),
};
```

**Step 2: Wire board router into appRouter**

Modify `packages/api/src/routers/index.ts`:

```typescript
import type { RouterClient } from "@orpc/server";
import { protectedProcedure, publicProcedure } from "../index";
import { boardRouter } from "./board";

export const appRouter = {
  healthCheck: publicProcedure.handler(() => {
    return "OK";
  }),
  privateData: protectedProcedure.handler(({ context }) => {
    return {
      message: "This is private",
      user: context.session?.user,
    };
  }),
  board: boardRouter,
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
```

**Step 3: Type check**

Run: `bun run check-types`
Expected: No type errors.

**Step 4: Commit**

```bash
git add packages/api/src/routers/board.ts packages/api/src/routers/index.ts
git commit -m "feat(api): add board CRUD router"
```

---

### Task 4: Install Frontend Dependencies

**Files:**
- Modify: `apps/web/package.json`

**Step 1: Install Excalidraw and TanStack DB**

Run from project root:
```bash
cd apps/web && bun add @excalidraw/excalidraw @tanstack/db @tanstack/react-db nanoid
```

> **Note:** If `@excalidraw/excalidraw` has peer dependency issues with React 19, try `bun add @excalidraw/excalidraw --force`. Excalidraw may need `@excalidraw/excalidraw@latest` or a specific version. Check the npm page if install fails.

**Step 2: Verify installation**

Run: `bun install` (from root)
Expected: All packages installed, no errors.

**Step 3: Commit**

```bash
git add apps/web/package.json bun.lock
git commit -m "chore(web): add excalidraw and tanstack-db dependencies"
```

---

### Task 5: Create TanStack DB Boards Collection

**Files:**
- Create: `apps/web/src/collections/boards.ts`

> **Reference:** Check TanStack DB docs at https://tanstack.com/db/latest/docs for the latest API. The `queryCollectionOptions` and `createCollection` APIs may have changed. Verify imports from `@tanstack/db` and `@tanstack/react-db`.

**Step 1: Create the boards collection**

Create `apps/web/src/collections/boards.ts`:

```typescript
import { createCollection, queryCollectionOptions } from "@tanstack/db";
import { client } from "@/utils/orpc";
import { queryClient } from "@/utils/orpc";

export type Board = {
  id: string;
  userId: string;
  title: string;
  elements: string;
  appState: string;
  files: string | null;
  thumbnailDataUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const boardsCollection = createCollection(
  queryCollectionOptions({
    queryKey: ["boards"],
    queryFn: async () => {
      return await client.board.list();
    },
    queryClient,
    getKey: (item: Board) => item.id,

    onInsert: async ({ transaction }) => {
      const newItems = transaction.mutations.map((m) => m.modified);
      for (const item of newItems) {
        await client.board.create({ title: item.title });
      }
    },

    onUpdate: async ({ transaction }) => {
      for (const mutation of transaction.mutations) {
        await client.board.update({
          id: mutation.key as string,
          ...mutation.changes,
        });
      }
    },

    onDelete: async ({ transaction }) => {
      const ids = transaction.mutations.map((m) => m.key as string);
      for (const id of ids) {
        await client.board.delete({ id });
      }
    },
  }),
);
```

> **Important:** The TanStack DB API is relatively new. If `queryCollectionOptions` is not the correct import or the API shape has changed, check the docs at https://tanstack.com/db/latest/docs/collections/query-collection. The core pattern is: create a collection that wraps TanStack Query and provides `onInsert`/`onUpdate`/`onDelete` handlers for persistence.

**Step 2: Type check**

Run: `bun run check-types`
Expected: No type errors. If there are type mismatches with the TanStack DB API, adjust the collection config to match the actual API.

**Step 3: Commit**

```bash
git add apps/web/src/collections/boards.ts
git commit -m "feat(web): add TanStack DB boards collection"
```

---

### Task 6: Build the Whiteboard Route (Excalidraw Canvas)

**Files:**
- Create: `apps/web/src/components/whiteboard.tsx`
- Create: `apps/web/src/routes/_authenticated/board/$boardId.tsx`

**Step 1: Create the Excalidraw wrapper component**

Create `apps/web/src/components/whiteboard.tsx`:

```tsx
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useState, useCallback, useRef, useEffect } from "react";
import { useTheme } from "@/components/theme-provider";
import { client } from "@/utils/orpc";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

interface WhiteboardProps {
  boardId: string;
  initialElements: string;
  initialAppState: string;
  initialFiles: string | null;
  title: string;
  onTitleChange: (title: string) => void;
}

export function Whiteboard({
  boardId,
  initialElements,
  initialAppState,
  initialFiles,
  title,
  onTitleChange,
}: WhiteboardProps) {
  const { theme } = useTheme();
  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");

  const resolvedTheme =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;

  const parsedElements = JSON.parse(initialElements);
  const parsedAppState = JSON.parse(initialAppState);
  const parsedFiles = initialFiles ? JSON.parse(initialFiles) : undefined;

  const handleChange = useCallback(
    (elements: readonly any[], appState: any, files: any) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const elementsJson = JSON.stringify(elements);
        const appStateSubset = JSON.stringify({
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemStrokeColor: appState.currentItemStrokeColor,
          currentItemBackgroundColor: appState.currentItemBackgroundColor,
        });

        // Skip save if nothing changed
        const fingerprint = `${elementsJson.length}:${elements.length}`;
        if (fingerprint === lastSavedRef.current) return;
        lastSavedRef.current = fingerprint;

        client.board.update({
          id: boardId,
          elements: elementsJson,
          appState: appStateSubset,
          files: files ? JSON.stringify(files) : null,
        });
      }, 500);
    },
    [boardId],
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <Excalidraw
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={{
          elements: parsedElements,
          appState: {
            ...parsedAppState,
          },
          files: parsedFiles,
        }}
        onChange={handleChange}
        theme={resolvedTheme}
        UIOptions={{
          canvasActions: {
            toggleTheme: false,
            export: false,
          },
        }}
      />
    </div>
  );
}
```

> **Note:** The Excalidraw type imports (`ExcalidrawImperativeAPI`, element types) may vary by version. Check `@excalidraw/excalidraw/types` or `@excalidraw/excalidraw` for the correct import path. If types aren't exported, use `any` and add a `// TODO: type properly` comment.

**Step 2: Create the board route**

Create `apps/web/src/routes/_authenticated/board/$boardId.tsx`:

```tsx
import { createFileRoute, redirect } from "@tanstack/react-router";
import { Whiteboard } from "@/components/whiteboard";
import { client } from "@/utils/orpc";
import { useQuery } from "@tanstack/react-query";
import { orpc } from "@/utils/orpc";
import { toast } from "sonner";
import { Loader } from "@/components/loader";

export const Route = createFileRoute("/_authenticated/board/$boardId")({
  component: BoardComponent,
});

function BoardComponent() {
  const { boardId } = Route.useParams();

  const {
    data: board,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => client.board.get({ id: boardId }),
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error || !board) {
    toast.error("Board not found");
    return null;
  }

  return (
    <Whiteboard
      boardId={board.id}
      initialElements={board.elements}
      initialAppState={board.appState}
      initialFiles={board.files}
      title={board.title}
      onTitleChange={(title) => {
        client.board.update({ id: board.id, title });
      }}
    />
  );
}
```

**Step 3: Verify dev server starts**

Run: `bun run dev`
Expected: No build errors. The route should be accessible at `http://localhost:3001/board/some-id` (will show "Board not found" toast since no board exists yet, which is correct).

**Step 4: Commit**

```bash
git add apps/web/src/components/whiteboard.tsx apps/web/src/routes/_authenticated/board/\$boardId.tsx
git commit -m "feat(web): add whiteboard component and board route"
```

---

### Task 7: Build the Board List Home Page

**Files:**
- Create: `apps/web/src/components/board-list.tsx`
- Modify: `apps/web/src/routes/_authenticated/index.tsx`

**Step 1: Install shadcn Card component if not already present**

Check if card component exists. If not, install it:

@frontend-design — Use for the board list UI design.

```bash
cd apps/web && bunx shadcn@latest add card
```

**Step 2: Create the board list component**

Create `apps/web/src/components/board-list.tsx`:

```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { client } from "@/utils/orpc";
import { nanoid } from "nanoid";
import { Plus, MoreHorizontal, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Loader } from "@/components/loader";

function formatRelativeDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return d.toLocaleDateString();
}

export function BoardList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: boards, isLoading } = useQuery({
    queryKey: ["boards"],
    queryFn: () => client.board.list(),
  });

  const createBoard = useMutation({
    mutationFn: () => client.board.create({}),
    onSuccess: (data) => {
      navigate({ to: "/board/$boardId", params: { boardId: data.id } });
    },
    onError: () => {
      toast.error("Failed to create board");
    },
  });

  const deleteBoard = useMutation({
    mutationFn: (id: string) => client.board.delete({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boards"] });
      toast.success("Board deleted");
    },
    onError: () => {
      toast.error("Failed to delete board");
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 pt-16 pb-8">
      {/* New board section */}
      <section className="mb-8">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">
          Start a new whiteboard
        </h2>
        <button
          onClick={() => createBoard.mutate()}
          disabled={createBoard.isPending}
          className="flex h-32 w-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-card transition-colors hover:border-primary/50 hover:bg-accent"
        >
          <Plus className="size-8 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Blank</span>
        </button>
      </section>

      {/* Recent boards */}
      {boards && boards.length > 0 && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-muted-foreground">
            Recent whiteboards
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {boards.map((b) => (
              <div
                key={b.id}
                className="group relative cursor-pointer overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md"
                onClick={() =>
                  navigate({
                    to: "/board/$boardId",
                    params: { boardId: b.id },
                  })
                }
              >
                {/* Thumbnail area */}
                <div className="flex h-28 items-center justify-center bg-muted/50">
                  {b.thumbnailDataUrl ? (
                    <img
                      src={b.thumbnailDataUrl}
                      alt={b.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-2xl text-muted-foreground/30">
                      ✏️
                    </div>
                  )}
                </div>

                {/* Info area */}
                <div className="flex items-center justify-between p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{b.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatRelativeDate(b.updatedAt)}
                    </p>
                  </div>

                  {/* Actions menu */}
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 opacity-0 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBoard.mutate(b.id);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {boards && boards.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground">No whiteboards yet</p>
          <p className="text-sm text-muted-foreground/70">
            Click "Blank" above to create your first one
          </p>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Update the home route**

Modify `apps/web/src/routes/_authenticated/index.tsx`:

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { BoardList } from "@/components/board-list";

export const Route = createFileRoute("/_authenticated/")({
  component: HomeComponent,
});

function HomeComponent() {
  return <BoardList />;
}
```

**Step 4: Verify dev server**

Run: `bun run dev`
Expected: Home page shows the board list with a "Blank" card to create a new board. Creating a board should navigate to the Excalidraw canvas.

**Step 5: Commit**

```bash
git add apps/web/src/components/board-list.tsx apps/web/src/routes/_authenticated/index.tsx
git commit -m "feat(web): add Google Docs-style board list home page"
```

---

### Task 8: Layout Adjustments — Hide Header on Board Route

**Files:**
- Modify: `apps/web/src/routes/_authenticated.tsx`

The current authenticated layout always renders `<Header />`. On the board route, Excalidraw needs full viewport. We need to conditionally hide the header.

**Step 1: Update the authenticated layout**

Modify `apps/web/src/routes/_authenticated.tsx`:

```tsx
import { Header } from "@/components/header";
import {
  Outlet,
  createFileRoute,
  redirect,
  useMatchRoute,
} from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ context, location }) => {
    const { data: session } = await context.auth.getSession();
    if (!session) {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const matchRoute = useMatchRoute();
  const isBoardRoute = matchRoute({ to: "/board/$boardId", fuzzy: true });

  return (
    <>
      {!isBoardRoute && <Header />}
      <Outlet />
    </>
  );
}
```

**Step 2: Verify**

Run: `bun run dev`
Expected: Header visible on home page, hidden on board routes. Excalidraw fills full viewport on board route.

**Step 3: Commit**

```bash
git add apps/web/src/routes/_authenticated.tsx
git commit -m "feat(web): hide header on board route for full-viewport canvas"
```

---

### Task 9: Type Check and Build Verification

**Step 1: Run type check**

Run: `bun run check-types`
Expected: No type errors across all packages.

**Step 2: Run build**

Run: `bun run build`
Expected: Build succeeds. If there are Excalidraw SSR/build issues with Vite, you may need to add Excalidraw to `optimizeDeps` in `vite.config.ts` or use dynamic imports.

**Step 3: Fix any issues**

If Excalidraw causes build issues (common with Vite), try:
- Add to `vite.config.ts`: `optimizeDeps: { include: ["@excalidraw/excalidraw"] }`
- Or lazy-load the component: `const Excalidraw = lazy(() => import("@excalidraw/excalidraw").then(m => ({ default: m.Excalidraw })))`

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(web): resolve excalidraw build/type issues"
```

---

### Task 10: End-to-End Smoke Test

This is a manual verification task.

**Step 1: Start dev servers**

Run: `bun run dev`

**Step 2: Test the flow**

1. Navigate to `http://localhost:3001` — should show board list
2. Click "Blank" — should create a board and navigate to Excalidraw
3. Draw some shapes — should auto-save (check network tab for oRPC calls after 500ms)
4. Navigate back to home — should see the board in the list
5. Click the board — should reload with your drawn shapes
6. Toggle dark/light mode — Excalidraw theme should follow
7. Delete a board from the list — should disappear

**Step 3: Fix any issues found during testing**

Common issues to watch for:
- Excalidraw CSS not loading → ensure `@excalidraw/excalidraw/index.css` is imported
- JSON parse errors → check that `elements`/`appState` columns have correct defaults
- Theme not syncing → check `resolvedTheme` logic in whiteboard component
- Auto-save firing too often → verify debounce is working (check network tab)

---

### Task 11 (Stretch): TanStack DB Integration

> **Note:** Tasks 1-10 use direct oRPC client calls for simplicity. This task converts to TanStack DB for optimistic updates. Only do this after the basic flow works end-to-end.

**Files:**
- Finalize: `apps/web/src/collections/boards.ts` (from Task 5)
- Modify: `apps/web/src/components/board-list.tsx` — use `useLiveQuery` instead of `useQuery`
- Modify: `apps/web/src/components/whiteboard.tsx` — use collection `update` instead of direct client calls

**Step 1: Wire up the board list with useLiveQuery**

Replace `useQuery` in `board-list.tsx` with:

```tsx
import { useLiveQuery } from "@tanstack/react-db";
import { boardsCollection } from "@/collections/boards";

// In the component:
const { data: boards, isLoading } = useLiveQuery((q) =>
  q.from({ boards: boardsCollection })
);
```

**Step 2: Wire up whiteboard saves**

Replace direct `client.board.update` calls in `whiteboard.tsx` with:

```tsx
import { boardsCollection } from "@/collections/boards";

// In the debounced save:
boardsCollection.update(boardId, (draft) => {
  draft.elements = elementsJson;
  draft.appState = appStateSubset;
  draft.files = files ? JSON.stringify(files) : null;
});
```

**Step 3: Test optimistic behavior**

Verify that board list updates instantly when creating/deleting, and that saves feel instant even with slow network (throttle in DevTools).

**Step 4: Commit**

```bash
git add apps/web/src/collections/boards.ts apps/web/src/components/board-list.tsx apps/web/src/components/whiteboard.tsx
git commit -m "feat(web): integrate TanStack DB for optimistic board persistence"
```
