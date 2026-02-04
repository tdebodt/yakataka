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

### Available MCP Tools

**Project Management**
- `list_projects` - List all projects
- `create_project` - Create a new project
- `get_project` - Get project with columns and cards
- `update_project` - Update project details
- `delete_project` - Delete a project

**Column Management**
- `create_column` - Add a status column
- `rename_column` - Rename a column
- `move_column` - Reorder columns
- `delete_column` - Delete a column

**Card Management**
- `create_card` - Create a card
- `move_card` - Move card to different column/position
- `update_card` - Update card details
- `delete_card` - Delete a card

**Dependency Management**
- `add_dependency` - Add a card dependency
- `remove_dependency` - Remove a dependency
- `get_card_dependencies` - Get cards this card depends on
- `get_card_dependents` - Get cards that depend on this card

**Event History**
- `get_project_history` - Get project event history
- `get_workspace_history` - Get workspace event history

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
