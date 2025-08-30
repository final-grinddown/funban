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
- **Framework**: Next.js 14 with App Router
- **UI**: Material-UI components with emotion styling
- **State**: Zustand for global state management
- **Auth**: NextAuth.js for authentication
- **Real-time**: WebSocket client for server synchronization
- **Data fetching**: TanStack Query for server state

Key directories:
- `src/app/` - Next.js app router pages
- `src/components/` - Reusable UI components
- `src/context/` - React context providers (Auth, WebSocket)
- `src/hooks/` - Custom React hooks
- `src/utils/` - Utility functions and types

## Key Design Principles

- **Workflow-based organization**: Notes flow through customizable states
- **Tags as execution context**: Tags provide context (`IMPORTANT`, `DEADLINE`, `WAITING`, `QUICK`) rather than priority
- **Position-based priority**: Order within workflow states determines priority
- **Real-time collaboration**: WebSocket synchronization with authenticated client tracking
- **Defensive programming**: Graceful error handling and fallback values

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