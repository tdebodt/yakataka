#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

// Parse workspace URL from arguments
const workspaceUrl = process.argv[2];
if (!workspaceUrl) {
  console.error('Usage: takayaka-mcp <workspace-url>');
  console.error('Example: takayaka-mcp http://localhost:3000/abc123-uuid-here');
  process.exit(1);
}

// Extract base URL and workspace ID from the URL
const urlMatch = workspaceUrl.match(/^(https?:\/\/[^\/]+)\/([a-f0-9-]+)$/i);
if (!urlMatch) {
  console.error('Invalid workspace URL format. Expected: http://localhost:3000/{workspace-uuid}');
  process.exit(1);
}

const [, baseUrl, workspaceId] = urlMatch;
const apiBase = `${baseUrl}/api`;

// API helper functions
async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${apiBase}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json();
}

// Create MCP server
const server = new Server(
  {
    name: 'takayaka',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define tools
const tools = [
  // Project Management
  {
    name: 'list_projects',
    description: 'List all projects in the workspace',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'create_project',
    description: 'Create a new project with default columns (To Do, In Progress, Done)',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Project name' },
        description: { type: 'string', description: 'Project description (optional)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'get_project',
    description: 'Get a project with all its columns, cards, and dependencies',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'update_project',
    description: 'Update a project name and/or description',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'New project name' },
        description: { type: 'string', description: 'New project description' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'delete_project',
    description: 'Delete a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },

  // Column Management
  {
    name: 'create_column',
    description: 'Add a new status column to a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        name: { type: 'string', description: 'Column name' },
        position: { type: 'number', description: 'Position (optional, defaults to end)' },
      },
      required: ['project_id', 'name'],
    },
  },
  {
    name: 'rename_column',
    description: 'Rename a status column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        column_id: { type: 'string', description: 'Column ID' },
        name: { type: 'string', description: 'New column name' },
      },
      required: ['project_id', 'column_id', 'name'],
    },
  },
  {
    name: 'move_column',
    description: 'Reorder a status column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        column_id: { type: 'string', description: 'Column ID' },
        position: { type: 'number', description: 'New position (0-indexed)' },
      },
      required: ['project_id', 'column_id', 'position'],
    },
  },
  {
    name: 'delete_column',
    description: 'Delete a column (moves cards to first column)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        column_id: { type: 'string', description: 'Column ID' },
      },
      required: ['project_id', 'column_id'],
    },
  },

  // Card Management
  {
    name: 'create_card',
    description: 'Create a card in a column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        column_id: { type: 'string', description: 'Column ID' },
        title: { type: 'string', description: 'Card title' },
        description: { type: 'string', description: 'Card description (optional)' },
        position: { type: 'number', description: 'Position within column (optional)' },
      },
      required: ['project_id', 'column_id', 'title'],
    },
  },
  {
    name: 'move_card',
    description: 'Move a card to a different column and/or position',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
        column_id: { type: 'string', description: 'Target column ID' },
        position: { type: 'number', description: 'Target position (optional)' },
      },
      required: ['project_id', 'card_id', 'column_id'],
    },
  },
  {
    name: 'update_card',
    description: 'Update card title and/or description',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
        title: { type: 'string', description: 'New card title' },
        description: { type: 'string', description: 'New card description' },
      },
      required: ['project_id', 'card_id'],
    },
  },
  {
    name: 'delete_card',
    description: 'Delete a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },

  // Dependency Management
  {
    name: 'add_dependency',
    description: 'Add a dependency (card depends on another card)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
        depends_on_card_id: { type: 'string', description: 'ID of the card this card depends on' },
      },
      required: ['project_id', 'card_id', 'depends_on_card_id'],
    },
  },
  {
    name: 'remove_dependency',
    description: 'Remove a dependency',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
        depends_on_card_id: { type: 'string', description: 'ID of the dependency to remove' },
      },
      required: ['project_id', 'card_id', 'depends_on_card_id'],
    },
  },
  {
    name: 'get_card_dependencies',
    description: 'Get cards that this card depends on',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },
  {
    name: 'get_card_dependents',
    description: 'Get cards that depend on this card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },

  // Event History
  {
    name: 'get_project_history',
    description: 'Get event history for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        limit: { type: 'number', description: 'Maximum number of events to return' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_workspace_history',
    description: 'Get event history for the workspace',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of events to return' },
      },
      required: [],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      // Project Management
      case 'list_projects':
        result = await apiRequest('GET', `/workspaces/${workspaceId}/projects`);
        break;

      case 'create_project':
        result = await apiRequest('POST', `/workspaces/${workspaceId}/projects`, {
          name: args?.name,
          description: args?.description,
        });
        break;

      case 'get_project':
        result = await apiRequest('GET', `/projects/${args?.project_id}`);
        break;

      case 'update_project':
        result = await apiRequest('PUT', `/projects/${args?.project_id}`, {
          name: args?.name,
          description: args?.description,
        });
        break;

      case 'delete_project':
        await apiRequest('DELETE', `/projects/${args?.project_id}`);
        result = { success: true };
        break;

      // Column Management
      case 'create_column':
        result = await apiRequest('POST', `/projects/${args?.project_id}/columns`, {
          name: args?.name,
          position: args?.position,
        });
        break;

      case 'rename_column':
        result = await apiRequest('PUT', `/columns/${args?.column_id}`, {
          project_id: args?.project_id,
          name: args?.name,
        });
        break;

      case 'move_column':
        result = await apiRequest('PUT', `/columns/${args?.column_id}`, {
          project_id: args?.project_id,
          position: args?.position,
        });
        break;

      case 'delete_column':
        await apiRequest('DELETE', `/columns/${args?.column_id}`, {
          project_id: args?.project_id,
        });
        result = { success: true };
        break;

      // Card Management
      case 'create_card':
        result = await apiRequest('POST', `/columns/${args?.column_id}/cards`, {
          project_id: args?.project_id,
          title: args?.title,
          description: args?.description,
          position: args?.position,
        });
        break;

      case 'move_card':
        result = await apiRequest('PUT', `/cards/${args?.card_id}`, {
          project_id: args?.project_id,
          column_id: args?.column_id,
          position: args?.position,
        });
        break;

      case 'update_card':
        result = await apiRequest('PUT', `/cards/${args?.card_id}`, {
          project_id: args?.project_id,
          title: args?.title,
          description: args?.description,
        });
        break;

      case 'delete_card':
        await apiRequest('DELETE', `/cards/${args?.card_id}`, {
          project_id: args?.project_id,
        });
        result = { success: true };
        break;

      // Dependency Management
      case 'add_dependency':
        result = await apiRequest('POST', `/cards/${args?.card_id}/dependencies`, {
          project_id: args?.project_id,
          depends_on_card_id: args?.depends_on_card_id,
        });
        break;

      case 'remove_dependency':
        await apiRequest('DELETE', `/cards/${args?.card_id}/dependencies/${args?.depends_on_card_id}`, {
          project_id: args?.project_id,
        });
        result = { success: true };
        break;

      case 'get_card_dependencies':
        result = await apiRequest('GET', `/cards/${args?.card_id}/dependencies?project_id=${args?.project_id}`);
        break;

      case 'get_card_dependents':
        result = await apiRequest('GET', `/cards/${args?.card_id}/dependents?project_id=${args?.project_id}`);
        break;

      // Event History
      case 'get_project_history': {
        const limitParam = args?.limit ? `?limit=${args.limit}` : '';
        result = await apiRequest('GET', `/projects/${args?.project_id}/events${limitParam}`);
        break;
      }

      case 'get_workspace_history': {
        const limitParam = args?.limit ? `?limit=${args.limit}` : '';
        result = await apiRequest('GET', `/workspaces/${workspaceId}/events${limitParam}`);
        break;
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${(error as Error).message}`,
        },
      ],
      isError: true,
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`TakaYaka MCP server started for workspace: ${workspaceId}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
