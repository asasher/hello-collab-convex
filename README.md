# hello-collab-convex

Turborepo scaffold for:
- Next.js (App Router)
- Tailwind CSS v4
- shadcn/ui
- Convex (local deployment)
- Portless local app URLs
- Bun package manager

## Workspace Layout

- `apps/web`: Next.js + Convex app

## Prerequisites

- Bun installed (`bun --version`)

## Install

```bash
bun install
```

## Run Development

```bash
bun run dev
```

`bun run dev` runs the `web` app through Turbo and starts:
- local Convex dev server/watcher
- Next.js dev server via Portless at `http://web.localhost:1355`

## Useful Scripts

```bash
bun run dev             # Turbo -> apps/web dev (Convex + Next via Portless)
bun run dev:next        # Next.js only (Portless)
bun run dev:convex      # Convex only
bun run codegen         # Regenerate Convex types
bun run lint
bun run build
```

## Notes

- Convex local deployment settings are in `apps/web/.env.local`.
- Generated Convex client/server types are in `apps/web/convex/_generated/`.
- UI component example: `apps/web/components/ui/button.tsx`.
