# Funban Server

Backend API for Funban - a real-time collaborative note and task management system built with Rust. Features customizable workflow states, execution context tags, and authenticated WebSocket synchronization.

*This is the server component. The React frontend is maintained in a separate repository.*

## Features

- **Workflow-based organization**: Notes flow through customizable workflow states
- **User-defined ordering**: Maintain custom note order within each workflow state
- **Execution context tags**: `IMPORTANT`, `DEADLINE`, `WAITING`, `QUICK` tags provide context without affecting priority
- **Real-time collaboration**: WebSocket-based synchronization with authenticated client tracking
- **Robust error handling**: Graceful degradation and comprehensive structured logging

## Architecture

- **Backend**: Rust with Axum web framework
- **Database**: MySQL with SQLX for compile-time query verification
- **Authentication**: JWT-based with middleware integration
- **Real-time**: WebSocket connections with per-client message routing
- **Observability**: Structured logging with client correlation via `tracing` crate

## Key Design Principles

- **Tags as execution context**: Tags answer "what should I know before starting this?" rather than indicating priority
- **Position-based priority**: Priority determined by order within workflow states, not tags
- **Defensive programming**: Fallback values and error recovery prevent system crashes
- **Layered architecture**: Clear separation between domain models, DTOs, and database operations

## API Capabilities

- CRUD operations for notes with real-time synchronization
- State transitions and custom ordering within states  
- Tag management (set/clear) with database-level validation
- Bulk operations with transaction support
- User-specific error responses and message routing
- Authenticated WebSocket connections with automatic client cleanup

## Development Status

Currently optimized for small-scale usage with 6+ months of production stability. The system emphasizes reliability and observability over high-scale performance.