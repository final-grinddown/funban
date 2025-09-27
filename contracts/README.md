# WebSocket Message Contracts

This directory contains automatically generated contracts for WebSocket messages between the Rust server and TypeScript frontend.

## Structure

- `generated/` - Auto-generated contracts from Rust build process
  - `ws_actions.json` - Example messages for all WsAction variants
  - `ws_operations.json` - Example messages for all WsOperation variants
- `README.md` - This file

## Generation Process

Contracts are automatically generated during the Rust build process via `server/build.rs`. The generator:

1. Creates example instances of each message type
2. Serializes them to JSON with pretty formatting
3. Writes them to this directory

## Usage

**Rust Side:**
- Tests in `server/tests/` validate that generated contracts can be deserialized
- Ensures type safety and JSON compatibility

**TypeScript Side:**
- Tests import generated contracts and validate message compatibility
- Frontend build process can sync types from generated contracts

## Important Notes

- **DO NOT** edit files in `generated/` manually - they will be overwritten
- Contracts are committed to git to ensure consistency across environments
- Any changes to `WsAction` or `WsOperation` types will automatically update contracts