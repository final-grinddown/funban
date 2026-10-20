# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Structure

Funban is a real-time collaborative Kanban board system with three main components:

- **`server/`** - Rust backend API (Axum + MySQL + WebSocket)
- **`web/`** - Next.js frontend application  
- **`_backup/`** - Contains archived versions and alternate implementations

## Development Commands

### Frontend (web/)
- **Development**: `yarn dev` (starts on localhost:3000)
- **Build**: `yarn build`  
- **Production**: `yarn start`
- **Type check**: `yarn check:ts`
- **Lint**: `yarn check:lint`
- **Combined checks**: `make check` (runs both TS and lint)

### Backend (server/)
- **Development**: `cargo run` (starts on port 3001)
- **Build**: `cargo build --release`
- **Test**: `cargo test`
- **Database migration**: `sqlx migrate run`
- **Docker development**: `docker-compose up` (includes MySQL database)
- **Generate TypeScript contracts**: `cargo test export_bindings` (exports Rust types to contracts/)

## Architecture Overview

### Backend (Rust/Axum)
- **Framework**: Axum web framework with MySQL database
- **Authentication**: JWT-based with middleware integration
- **Real-time**: WebSocket connections for live collaboration
- **Database**: MySQL with SQLX for compile-time query verification
- **Configuration**: Environment-based via `FUNBAN_*` prefixed variables or `env.toml`

Key modules:
- `http/routes/` - REST API endpoints (auth, notes, users, history)
- `ws/` - WebSocket handlers for real-time updates
- `state/` - Core business logic and state management
- `sql/` - Database operations and models
- `model/` - Domain models and DTOs

### Frontend (Next.js/React)
- **Framework**: Next.js 15 with App Router
- **UI**: Material-UI components with emotion styling
- **State**: Zustand for global state management
- **Auth**: NextAuth.js for authentication
- **Real-time**: WebSocket client with reconnecting-websocket for automatic reconnection
- **Data fetching**: TanStack Query for server state
- **Drag & Drop**: @dnd-kit library for kanban board interactions

Key directories:
- `src/app/` - Next.js app router pages
- `src/components/` - Reusable UI components (modals, forms, boards)
- `src/context/` - React context providers (Auth, WebSocket)
- `src/hooks/` - Custom React hooks (useModalSubmission, useFormValidation)
- `src/utils/` - Utility functions and types
- `src/websocket/handlers/` - Modular WebSocket message handlers
- `src/types/` - Centralized TypeScript type definitions

## Key Design Principles

- **Workflow-based organization**: Notes flow through customizable states
- **Tags as execution context**: Tags provide context (`IMPORTANT`, `DEADLINE`, `WAITING`, `QUICK`) rather than priority
- **Position-based priority**: Order within workflow states determines priority
- **Real-time collaboration**: WebSocket synchronization with authenticated client tracking
- **Defensive programming**: Graceful error handling and fallback values
- **Flexible user marks**: Visual indicators (⚫, ⭐, 🕐, 🩺, 🌴, etc.) with flexible expiration options
- **Component reusability**: Shared hooks and components to eliminate duplication
- **Type safety**: Strict TypeScript with no `any` types where possible

## Code Quality Standards

### Naming Conventions
- **Event handlers**: Use `handle*` prefix for internal event handlers (e.g., `handleFormSubmit`, `handleClick`)
- **Callback props**: Use `on*` prefix for callback props passed to components (e.g., `onClose`, `onSubmit`)

### Component Structure
- **Error handling**: Use `ErrorBoundary` component to wrap error-prone sections
- **Error utilities**: Use centralized error handling from `src/utils/errorHandler.ts`
- **Modal patterns**: Use `useModalSubmission` hook for consistent modal submission behavior
- **Form validation**: Use `useFormValidation` hook for standardized form validation
- **Type-safe MUI props**: Use `MuiSxProps` type instead of `any` for Material-UI sx props

### WebSocket Architecture
- **Automatic reconnection**: Uses `reconnecting-websocket` library
- **Modular handlers**: Message handlers organized by operation type in `src/websocket/handlers/`
- **Connection status**: Visible connection status badge for user feedback

## User Marks System

User marks are visual indicators attached to users (e.g., ⚫ Black Mark, ⭐ Gold Star, 🌴 Vacation). Each mark supports flexible expiration:

- **Standup-based expiration**: Mark expires after N standup/status changes (e.g., "expires after 5 standups")
- **Date-based expiration**: Mark expires at a specific date/time (e.g., "expires on Oct 15, 2025 3:00 PM")
- **Dual expiration**: Both types enabled - whichever expires first (e.g., "after 5 standups OR on Oct 15")
- **Permanent marks**: No expiration set - remains until manually deleted

Database fields:
- `expires_after_status_ends` (nullable INT) - standup counter, NULL = no standup expiration
- `expires_at` (nullable DATETIME) - expiration date, NULL = no date expiration

UI uses checkboxes in both Add and Edit modals to toggle expiration types independently.

## Database Setup

The server requires MySQL 5.7+ with connection configured via environment variables:
- `FUNBAN_DATABASE_URL`, `FUNBAN_DATABASE_USER`, `FUNBAN_DATABASE_PASSWORD`, `FUNBAN_DATABASE_NAME`
- Migrations in `server/migrations/` are auto-applied on startup
- Docker Compose provides development database setup

## Development Workflow

1. Start MySQL database: `cd server && docker-compose up db`
2. Start backend: `cd server && cargo run`  
3. Start frontend: `cd web && yarn dev`
4. Both components support hot reload during development