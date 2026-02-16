# Whiteboard Feature Design

**Date:** 2026-02-16
**Status:** Approved
**Approach:** Embed `@excalidraw/excalidraw` as a React component with TanStack DB for optimistic persistence to D1

## Purpose

Personal sketching whiteboard — a hand-drawn style infinite canvas for quick diagrams, wireframes, and visual thinking. No real-time collaboration needed. Multiple boards with a Google Docs-inspired home page.

## Architecture & Routing

| Route | Purpose |
|-------|---------|
| `/_authenticated/` (home) | Board list — Google Docs-style grid of saved whiteboards |
| `/_authenticated/board/$boardId` | Full-viewport Excalidraw canvas |

## Data Model

New `board` table in D1 via Drizzle (`packages/db/src/schema/board.ts`):

| Column | Type | Notes |
|--------|------|-------|
| `id` | text | Primary key (nanoid) |
| `userId` | text | FK → user.id |
| `title` | text | Default "Untitled" |
| `elements` | text | JSON serialized Excalidraw elements |
| `appState` | text | JSON serialized appState subset |
| `files` | text | JSON serialized files (nullable) |
| `thumbnailDataUrl` | text | Nullable, for board list preview |
| `createdAt` | integer | Timestamp |
| `updatedAt` | integer | Timestamp |

## Packages

- `@excalidraw/excalidraw` — whiteboard component
- `@tanstack/db` — `createCollection`, `queryCollectionOptions`
- `@tanstack/react-db` — `useLiveQuery` React hook

## File Structure

```
apps/web/src/
├── routes/
│   ├── _authenticated/
│   │   ├── index.tsx              ← Board list (home)
│   │   └── board/
│   │       └── $boardId.tsx       ← Excalidraw canvas
├── components/
│   ├── board-list.tsx             ← Grid of board cards
│   └── whiteboard.tsx             ← Excalidraw wrapper
├── collections/
│   └── boards.ts                  ← TanStack DB collection + oRPC wiring
```

## Board List (Home Page)

Google Docs-inspired layout:

- **Top section:** "Start a new whiteboard" with a blank canvas card
- **Recent section:** Grid of board cards sorted by `updatedAt` desc
- Each card: thumbnail (or placeholder), title, relative date
- Click → navigate to `/board/$boardId`
- Right-click / three-dot menu: Rename, Delete
- Grid/list view toggle (grid default)
- Header visible on this page

## Excalidraw Integration

**Whiteboard wrapper (`whiteboard.tsx`):**
- Receives `boardId` as prop
- Loads board from `boardsCollection` via `useLiveQuery`
- Passes `initialData` (elements, appState, files) to `<Excalidraw />`
- Captures `excalidrawAPI` ref
- `onChange` debounced (500ms) → `boardsCollection.update()`
- `theme` synced to app's dark/light mode
- Full viewport, header hidden on board route

**Excalidraw customization:**
- `UIOptions.canvasActions.toggleTheme: false` (controlled by app)
- `UIOptions.canvasActions.export: false` (we handle persistence)
- Everything else default

## Backend & API

**oRPC endpoints in `packages/api/src/`:**

| Endpoint | Type | Description |
|----------|------|-------------|
| `board.list` | query | List boards for current user (sorted by updatedAt desc) |
| `board.get` | query | Get single board by ID (ownership check) |
| `board.create` | mutation | Create new board, return ID |
| `board.update` | mutation | Update elements/appState/title/files |
| `board.delete` | mutation | Delete a board |

All endpoints validate board ownership via session middleware.

## Persistence Flow

1. `boardsCollection` created with `queryCollectionOptions` wired to oRPC endpoints
2. `onInsert` → `orpc.board.create`
3. `onUpdate` → `orpc.board.update`
4. `onDelete` → `orpc.board.delete`
5. Excalidraw `onChange` debounces (500ms) then calls `boardsCollection.update()`
6. TanStack DB applies optimistic state immediately, persists to D1 in background

## Auto-Save Strategy

- Excalidraw `onChange` fires on every interaction
- Debounce 500ms before writing to collection
- Only save when elements/appState actually changed
- TanStack DB handles optimistic state + background persistence

## Board Title

- Default "Untitled" on creation
- Editable inline in board view (minimal top bar)
- Also editable from board list (right-click rename)

## Thumbnail Generation (Stretch Goal)

- Use Excalidraw `exportToBlob()` API on save
- Convert to data URL, store in `thumbnailDataUrl`
- Only regenerate when elements change
- Placeholder if not ready for v1

## Error Handling

- Board not found → redirect to home with toast
- Save failure → TanStack DB retries, error toast after repeated failure
- Excalidraw load failure → fallback loading state

## Dark Mode

- Pass `theme` prop to Excalidraw from app's ThemeProvider
- Disable Excalidraw's built-in theme toggle
