# Funban

A real-time collaborative Kanban board system with customizable workflow states, execution context tags, and seamless synchronization.

> **Note**: This is a private hobby project created to solve a specific problem and is so far not intended for wider public use.

## Architecture

- **Backend** (`server/`): Rust/Axum API with MySQL and WebSocket support
- **Frontend** (`web/`): Next.js/React application with Material-UI
- **Deployment**: Docker containers with GitHub Actions CI/CD

## Features

- **Workflow-based organization**: Notes flow through customizable workflow states
- **User-defined ordering**: Maintain custom note order within each workflow state via drag & drop (@dnd-kit)
- **Execution context tags**: `IMPORTANT`, `DEADLINE`, `WAITING`, `QUICK` tags provide context without affecting priority
- **Real-time collaboration**: WebSocket-based synchronization with automatic reconnection and authenticated client tracking
- **Note splitting**: Split notes into separate items for better granularity
- **User marks**: Visual indicators with flexible expiration (standup-based, date-based, or permanent)
- **Responsive UI**: Material-UI components with mobile-friendly design
- **JWT Authentication**: Secure user sessions with NextAuth.js integration
- **Connection monitoring**: Visual connection status badge for real-time feedback

## Key Design Principles

- **Tags as execution context**: Tags answer "what should I know before starting this?" rather than indicating priority
- **Position-based priority**: Priority determined by order within workflow states, not tags
- **Defensive programming**: Graceful error handling and fallback values prevent system crashes
- **Real-time sync**: WebSocket connections maintain state consistency across clients

## Quick Start

### Prerequisites
- Node.js 20+
- Rust 1.70+
- MySQL 5.7+
- Docker (optional)

### Development

1. **Start the database:**
   ```bash
   cd server && docker-compose up db
   ```

2. **Start the backend:**
   ```bash
   cd server && cargo run
   ```

3. **Start the frontend:**
   ```bash
   cd web && yarn install && yarn dev
   ```

4. **Or use the root Makefile:**
   ```bash
   make dev
   ```

### Using Docker

```bash
# Start all services
docker-compose up

# Build and start
make docker-up
```

## Project Structure

```
funban/
├── server/          # Rust backend (port 3001)
│   ├── src/         # Source code
│   ├── migrations/  # Database migrations
│   └── Dockerfile   # Server container
├── web/             # Next.js frontend (port 3000)
│   ├── src/         # React components and pages
│   └── Dockerfile   # Web container
├── .github/         # CI/CD workflows
├── docker-compose.yml
└── Makefile         # Build orchestration
```

## Available Commands

### Root Level (Makefile)
- `make dev` - Start both components in development
- `make build` - Build both components
- `make test` - Run all tests
- `make check` - Run type checks and linting
- `make docker-up` - Start with Docker Compose

### Backend (`server/`)
- `cargo run` - Start development server
- `cargo build --release` - Production build
- `cargo test` - Run tests
- `sqlx migrate run` - Apply database migrations

### Frontend (`web/`)
- `yarn dev` - Start development server
- `yarn build` - Production build
- `yarn check:ts` - TypeScript check
- `yarn check:lint` - ESLint check

## Environment Configuration

### Server
Configure via `server/.env` or environment variables:
- `FUNBAN_DATABASE_URL` - MySQL connection string
- `FUNBAN_JWT_SECRET` - JWT signing secret
- `FUNBAN_SERVER_PORT` - Server port (default: 3001)

### Web
Configure via `web/.env.local`:
- `NEXT_PUBLIC_API_URL` - Backend API URL
- `NEXT_PUBLIC_WS_URL` - WebSocket URL
- `NEXTAUTH_SECRET` - NextAuth.js secret

## Deployment

The project uses GitHub Actions for CI/CD (`.github/workflows/ci-cd.yml`):

- **PR checks**: Automated testing and linting for the changed components
- **Releases**: Pushing a `vX.Y.Z` tag runs all tests, publishes signed Docker images to GHCR and creates a GitHub Release
- **Deployment**: Manual: pull the new images on the server and restart (migrations run on server start)

Cut a release with `make release VERSION=x.y.z`. See [docs/RELEASING.md](docs/RELEASING.md) for the full process.

## Technology Stack

### Backend
- **Framework**: Axum web framework
- **Database**: MySQL with SQLX (compile-time query verification)
- **Authentication**: JWT middleware
- **Real-time**: WebSocket connections
- **Observability**: Structured logging with `tracing`

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: Material-UI with emotion styling
- **State Management**: Zustand
- **Authentication**: NextAuth.js
- **Data Fetching**: TanStack Query
- **Real-time**: WebSocket client with automatic reconnection (reconnecting-websocket)
- **Drag & Drop**: @dnd-kit library
- **Error Handling**: React Error Boundaries with centralized error utilities

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes in the appropriate component (`server/` or `web/`)
4. Run checks: `make check`
5. Submit a pull request

Changes are automatically tested via GitHub Actions based on the modified paths.