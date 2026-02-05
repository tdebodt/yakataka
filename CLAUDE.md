# YakaTaka - Claude Code Context

## Project Overview

YakaTaka is a Kanban board application with MCP integration. It uses event sourcing architecture with two aggregate roots: Workspace and Project.

## Quick Commands

```bash
# Install dependencies
npm install

# Development (runs backend, frontend, and MCP server)
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
yakataka/
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

The MCP server uses Streamable HTTP transport (MCP protocol 2025-03-26) and is project-scoped. It starts automatically with `npm run dev` on port 3002.

To connect Claude Code to a specific project:
```bash
claude mcp add yakataka --transport http http://localhost:3002/mcp/{project-id}
```

The project ID can be found in the Project Settings modal (click the gear icon on a project).

### Manual MCP Server Options
```bash
# Custom port
node mcp-server/dist/index.js --port 4000

# Custom backend URL
node mcp-server/dist/index.js --backend http://other-host:3000
```

It provides 11 tools for managing tasks and dependencies within a project:

**Board Overview**
- `get_project` - Get the Kanban board with all tasks and workflow statuses

**Task Management**
- `create_card` - Create a new task in a workflow status
- `move_card` - Move a task to a different workflow status
- `update_card` - Update a task's title and/or description
- `delete_card` - Delete a task from the board

**Dependency Management**
- `add_dependency` - Mark a task as blocked by another task
- `remove_dependency` - Remove a blocker from a task
- `get_card_dependencies` - Get the tasks that are blocking this task
- `get_card_dependents` - Get the tasks that are blocked by this task

**Event History**
- `get_history` - Get the history of changes to the board
- `get_card_history` - Get the history of changes to a specific task

## Database

SQLite database stored at `server/data/yakataka.db`. Uses WAL mode for performance.

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
