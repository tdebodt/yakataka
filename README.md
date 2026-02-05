
# YakaTaka

A Trello-like Kanban board solution with web interface and MCP (Model Context Protocol) integration for Claude Code.

## Features

- **Kanban Boards**: Create projects with customizable columns and drag-and-drop cards
- **Card Dependencies**: Track blockers and dependencies between cards
- **Event Sourcing**: Full history of all changes for audit and undo capabilities
- **MCP Integration**: Manage your boards directly from Claude Code
- **UUID-based Workspaces**: No login required - just bookmark your workspace URL

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Start the development server
npm run dev
```

Then open http://localhost:5173 in your browser. You'll be redirected to a new workspace.

## Project Structure

```
yakataka/
├── server/         # Express backend with SQLite event store
├── client/         # React + Vite + Tailwind frontend
└── mcp-server/     # MCP server for Claude Code integration
```

## MCP Integration

To use YakaTaka with Claude Code:

1. Start the server: `npm run dev:server`
2. Open the web UI and create a workspace
3. Copy the MCP command from the Settings panel
4. Run the command to add YakaTaka to Claude Code

### Available MCP Tools (11 tools)

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

## Tech Stack

- **Backend**: Node.js, TypeScript, Express, SQLite (better-sqlite3)
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, @hello-pangea/dnd
- **MCP**: @modelcontextprotocol/sdk

## Architecture

YakaTaka uses **Event Sourcing** with **Domain-Driven Design**:

- **Workspace Aggregate**: Manages workspace metadata
- **Project Aggregate**: Manages projects, columns, cards, and dependencies

All state changes are stored as events, enabling full history tracking and state reconstruction.

## License

MIT
