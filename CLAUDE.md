# TakaYaka - Claude Code Context

## Project Overview

TakaYaka is a Kanban board application with MCP integration. It uses event sourcing architecture with two aggregate roots: Workspace and Project.

## Quick Commands

```bash
# Install dependencies
npm install

# Development (runs both server and client)
npm run dev

# Run only server (port 3000)
npm run dev:server

# Run only client (port 5173, proxies /api to server)
npm run dev:client

# Build all packages
npm run build
```

## Project Structure

```
takayaka/
├── server/                 # Express backend
│   └── src/
│       ├── index.ts        # Server entry point
│       ├── db/             # SQLite connection
│       ├── domain/         # DDD aggregates
│       │   ├── workspace/  # Workspace aggregate
│       │   └── project/    # Project aggregate (columns, cards, deps)
│       ├── infrastructure/ # Event store
│       └── routes/         # REST API routes
├── client/                 # React frontend
│   └── src/
│       ├── App.tsx         # Main app component
│       ├── components/     # UI components
│       └── hooks/          # API hooks
└── mcp-server/             # MCP server for Claude Code
    └── src/
        └── index.ts        # MCP tools implementation
```

## Architecture

### Event Sourcing
All state changes are stored as events in SQLite. State is reconstructed by replaying events.

**Event Store Table:**
- `aggregate_type`: 'workspace' | 'project'
- `aggregate_id`: UUID
- `event_type`: e.g., 'CardMoved', 'ProjectCreated'
- `event_data`: JSON payload
- `version`: For optimistic concurrency

### Domain Model
- **Workspace**: Contains projects, identified by UUID (used in URL)
- **Project**: Contains columns, cards, and dependencies
- **Column**: Status column (e.g., "To Do", "In Progress", "Done")
- **Card**: Task with title, description, position, and dependencies

### API Structure
- `POST /api/workspaces` - Create workspace
- `GET /api/workspaces/:uuid` - Get/create workspace
- `GET/POST /api/workspaces/:uuid/projects` - List/create projects
- `GET/PUT/DELETE /api/projects/:id` - Project CRUD
- `POST /api/projects/:id/columns` - Add column
- `PUT/DELETE /api/columns/:id` - Update/delete column
- `POST /api/columns/:id/cards` - Add card
- `PUT/DELETE /api/cards/:id` - Update/delete card
- `GET/POST/DELETE /api/cards/:id/dependencies` - Manage dependencies

## Key Files

- `server/src/domain/project/aggregate.ts` - Core business logic
- `server/src/infrastructure/eventStore.ts` - Event persistence
- `client/src/components/ProjectBoard.tsx` - Main Kanban UI
- `client/src/hooks/useApi.ts` - API client hooks
- `mcp-server/src/index.ts` - All MCP tools

## MCP Server

The MCP server runs on HTTP with SSE transport. Start it with:
```bash
# Default port 3001
node mcp-server/dist/index.js http://localhost:3000/{workspace-uuid}

# Custom port
node mcp-server/dist/index.js http://localhost:3000/{workspace-uuid} --port 4000

# Or via environment variable
MCP_PORT=4000 node mcp-server/dist/index.js http://localhost:3000/{workspace-uuid}
```

Then add to Claude Code:
```bash
claude mcp add takayaka --transport sse http://localhost:3001/sse
```

It provides 18 tools for managing projects, columns, cards, and dependencies.

## Database

SQLite database stored at `server/data/takayaka.db`. Uses WAL mode for performance.

## Testing the API

```bash
# Create workspace
curl -X POST http://localhost:3000/api/workspaces

# Create project
curl -X POST http://localhost:3000/api/workspaces/{uuid}/projects \
  -H "Content-Type: application/json" \
  -d '{"name":"My Project"}'

# Get project
curl http://localhost:3000/api/projects/{project-id}
```
