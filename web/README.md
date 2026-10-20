# Funban Web

Frontend application for Funban - a real-time collaborative Kanban board system. Built with Next.js, Material-UI, and WebSocket synchronization.

_This is the web component. The Rust backend API is in the `../server/` directory._

## Features

- **Real-time Kanban board**: Drag-and-drop notes between customizable workflow states
- **Execution context tags**: Visual tags (`IMPORTANT`, `DEADLINE`, `WAITING`, `QUICK`) provide context
- **User marks system**: Visual indicators (⚫, ⭐, 🕐, 🩺, 🌴) with flexible expiration options:
  - Standup-based expiration (e.g., "expires after 5 standups")
  - Date-based expiration (e.g., "expires on Oct 15, 2025")
  - Dual expiration (whichever expires first)
  - Permanent marks (no expiration)
- **Live collaboration**: Multiple users can work simultaneously with instant synchronization
- **Focus mode**: Cycle through users during standups with keyboard shortcuts
- **Note history**: Track changes and restore previous versions

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **UI**: Material-UI with Emotion styling
- **State Management**: Zustand for global state, TanStack Query for server state
- **Authentication**: NextAuth.js with JWT
- **Real-time**: WebSocket client for server synchronization
- **Type Safety**: TypeScript with runtime validation via Typia
  - ⚠️ Note: Uses `@ryoppippi/unplugin-typia` (archived but functional). See [`docs/architecture/validation.md`](../docs/architecture/validation.md) for details.

## Getting Started

1. **Install dependencies**:

```bash
yarn install
```

2. **Configure environment**:
   Create `.env.local` with backend URL:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXTAUTH_SECRET=your-secret-here
```

3. **Run development server**:

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Commands

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn start` - Start production server
- `yarn check:ts` - Type check with TypeScript
- `yarn check:lint` - Lint with ESLint
- `yarn test` - Run tests

See `../Makefile` for combined backend+frontend commands.

## Architecture Documentation

- **[Runtime Validation](../docs/architecture/validation.md)** - Typia setup, architecture, and dependency status
- **[Refactoring Plan](../REFACTORING_PLAN.md)** - Ongoing frontend improvements and migration strategies
