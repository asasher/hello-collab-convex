# hello-collab-convex

Reference project for showcasing collaborative editing patterns with Convex.

## What This Demonstrates

- Shared nested app state stored as one Convex document (`appState` table)
- Optimistic client updates for low-latency editing
- Presence tracking via the Convex Presence component (`@convex-dev/presence`)
- Field-level "who is editing" UI hints
- Real-time JSON preview of current shared state

## Stack

- Bun workspaces + Turborepo
- Next.js App Router (React 19)
- Convex
- Tailwind CSS + shadcn/ui

## Project Layout

- `apps/web/app/page.tsx`: collaborative editor UI
- `apps/web/convex/appState.ts`: read/update shared document
- `apps/web/convex/presence.ts`: Presence component wrappers + metadata updates
- `apps/web/convex/convex.config.ts`: mounts Presence component
- `apps/web/convex/schema.ts`: `appState` table

## Quick Start

```bash
bun install
bun run dev
```

Then open `http://web.localhost:1355`.

## Scripts

```bash
bun run dev       # Turbo dev (web app)
bun run build     # Turbo build (web)
bun run lint      # Turbo lint (web)
bun run codegen   # Convex codegen through Turbo
```

## Collaboration Flow

1. Open the app in two browser tabs/windows.
2. Edit a field in one tab.
3. Watch instant state updates and presence indicators in the other tab.
4. Use the tags control to test collaborative selection state.

## Notes

- Convex generated types live in `apps/web/convex/_generated/`.
- Presence heartbeats/disconnect handling come from `@convex-dev/presence/react`.
