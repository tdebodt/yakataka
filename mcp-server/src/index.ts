#!/usr/bin/env node
import express, { Request, Response } from 'express';
import { randomUUID } from 'crypto';

// Parse arguments
function parseArgs() {
  const args = process.argv.slice(2);
  let backendUrl = 'http://localhost:3000'; // Default backend URL
  let port = 3002; // Default port

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' || args[i] === '-p') {
      const portArg = parseInt(args[i + 1], 10);
      if (!isNaN(portArg)) {
        port = portArg;
        i++;
      }
    } else if (args[i] === '--backend' || args[i] === '-b') {
      backendUrl = args[i + 1];
      i++;
    } else if (!args[i].startsWith('-')) {
      backendUrl = args[i];
    }
  }

  // Also check environment variables
  if (process.env.MCP_PORT) {
    const envPort = parseInt(process.env.MCP_PORT, 10);
    if (!isNaN(envPort)) {
      port = envPort;
    }
  }
  if (process.env.TAKAYAKA_BACKEND) {
    backendUrl = process.env.TAKAYAKA_BACKEND;
  }

  return { backendUrl, port };
}

const { backendUrl, port } = parseArgs();
const apiBase = `${backendUrl}/api`;

// API helper functions
async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${apiBase}${path}`;
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Source': 'mcp',
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
  {
    name: 'get_card_history',
    description: 'Get event history for a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        card_id: { type: 'string', description: 'Card ID' },
        limit: { type: 'number', description: 'Maximum number of events to return' },
      },
      required: ['project_id', 'card_id'],
    },
  },
];

// Tool handler function - takes workspaceId as parameter
async function handleToolCall(workspaceId: string, name: string, args: Record<string, unknown> | undefined): Promise<unknown> {
  switch (name) {
    // Project Management
    case 'list_projects':
      return apiRequest('GET', `/workspaces/${workspaceId}/projects`);

    case 'create_project':
      return apiRequest('POST', `/workspaces/${workspaceId}/projects`, {
        name: args?.name,
        description: args?.description,
      });

    case 'get_project':
      return apiRequest('GET', `/projects/${args?.project_id}`);

    case 'update_project':
      return apiRequest('PUT', `/projects/${args?.project_id}`, {
        name: args?.name,
        description: args?.description,
      });

    case 'delete_project':
      await apiRequest('DELETE', `/projects/${args?.project_id}`);
      return { success: true };

    // Column Management
    case 'create_column':
      return apiRequest('POST', `/projects/${args?.project_id}/columns`, {
        name: args?.name,
        position: args?.position,
      });

    case 'rename_column':
      return apiRequest('PUT', `/columns/${args?.column_id}`, {
        project_id: args?.project_id,
        name: args?.name,
      });

    case 'move_column':
      return apiRequest('PUT', `/columns/${args?.column_id}`, {
        project_id: args?.project_id,
        position: args?.position,
      });

    case 'delete_column':
      await apiRequest('DELETE', `/columns/${args?.column_id}`, {
        project_id: args?.project_id,
      });
      return { success: true };

    // Card Management
    case 'create_card':
      return apiRequest('POST', `/columns/${args?.column_id}/cards`, {
        project_id: args?.project_id,
        title: args?.title,
        description: args?.description,
        position: args?.position,
      });

    case 'move_card':
      return apiRequest('PUT', `/cards/${args?.card_id}`, {
        project_id: args?.project_id,
        column_id: args?.column_id,
        position: args?.position,
      });

    case 'update_card':
      return apiRequest('PUT', `/cards/${args?.card_id}`, {
        project_id: args?.project_id,
        title: args?.title,
        description: args?.description,
      });

    case 'delete_card':
      await apiRequest('DELETE', `/cards/${args?.card_id}`, {
        project_id: args?.project_id,
      });
      return { success: true };

    // Dependency Management
    case 'add_dependency':
      return apiRequest('POST', `/cards/${args?.card_id}/dependencies`, {
        project_id: args?.project_id,
        depends_on_card_id: args?.depends_on_card_id,
      });

    case 'remove_dependency':
      await apiRequest('DELETE', `/cards/${args?.card_id}/dependencies/${args?.depends_on_card_id}`, {
        project_id: args?.project_id,
      });
      return { success: true };

    case 'get_card_dependencies':
      return apiRequest('GET', `/cards/${args?.card_id}/dependencies?project_id=${args?.project_id}`);

    case 'get_card_dependents':
      return apiRequest('GET', `/cards/${args?.card_id}/dependents?project_id=${args?.project_id}`);

    // Event History
    case 'get_project_history': {
      const limitParam = args?.limit ? `?limit=${args.limit}` : '';
      return apiRequest('GET', `/projects/${args?.project_id}/events${limitParam}`);
    }

    case 'get_workspace_history': {
      const limitParam = args?.limit ? `?limit=${args.limit}` : '';
      return apiRequest('GET', `/workspaces/${workspaceId}/events${limitParam}`);
    }

    case 'get_card_history': {
      const params = new URLSearchParams({ project_id: args?.project_id as string });
      if (args?.limit) {
        params.append('limit', String(args.limit));
      }
      return apiRequest('GET', `/cards/${args?.card_id}/events?${params}`);
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Create Express app
const app = express();

// Handle CORS preflight and enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Accept, mcp-session-id');
  res.header('Access-Control-Expose-Headers', 'mcp-session-id');

  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

// Store sessions with workspace context
interface Session {
  workspaceId: string;
  createdAt: Date;
}

const sessions = new Map<string, Session>();

// Server info for MCP protocol
const SERVER_INFO = {
  name: 'yakataka',
  version: '1.0.0',
};

const SERVER_CAPABILITIES = {
  tools: {},
};

const PROTOCOL_VERSION = '2025-03-26';

// JSON-RPC types
interface JsonRpcRequest {
  jsonrpc: '2.0';
  id?: number | string;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id?: number | string;
  result?: unknown;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

// Handle MCP JSON-RPC methods
async function handleMcpMethod(
  method: string,
  params: Record<string, unknown> | undefined,
  workspaceId: string
): Promise<unknown> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: SERVER_CAPABILITIES,
        serverInfo: SERVER_INFO,
      };

    case 'tools/list':
      return { tools };

    case 'tools/call': {
      const toolName = params?.name as string;
      const toolArgs = params?.arguments as Record<string, unknown> | undefined;

      if (!toolName) {
        throw { code: -32602, message: 'Missing tool name' };
      }

      const tool = tools.find((t) => t.name === toolName);
      if (!tool) {
        throw { code: -32602, message: `Unknown tool: ${toolName}` };
      }

      try {
        const result = await handleToolCall(workspaceId, toolName, toolArgs);
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
    }

    case 'ping':
      return {};

    default:
      throw { code: -32601, message: `Method not found: ${method}` };
  }
}

// Parse JSON body middleware
app.use('/mcp/:workspaceId', express.json());

// MCP endpoint - workspace ID in URL path
app.all('/mcp/:workspaceId', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;

  if (!workspaceId || !/^[a-f0-9-]+$/i.test(workspaceId)) {
    res.status(400).json({ error: 'Invalid workspace ID' });
    return;
  }

  // Handle GET for SSE connections (not used by Claude Code for Streamable HTTP)
  if (req.method === 'GET') {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32600,
        message: 'GET not supported. Use POST for MCP requests.',
      },
    });
    return;
  }

  // Handle DELETE to close sessions
  if (req.method === 'DELETE') {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (sessionId && sessions.has(sessionId)) {
      sessions.delete(sessionId);
      console.log(`Session deleted: ${sessionId}`);
    }
    res.status(204).send();
    return;
  }

  // Only POST allowed from here
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get session ID from header
  let sessionId = req.headers['mcp-session-id'] as string | undefined;
  let session = sessionId ? sessions.get(sessionId) : undefined;

  // Parse the JSON-RPC request
  const body = req.body as JsonRpcRequest | JsonRpcRequest[];

  // Handle single request
  if (!Array.isArray(body)) {
    const request = body;

    // Handle 'initialized' notification (no id means notification)
    if (request.method === 'initialized' && request.id === undefined) {
      res.status(202).send();
      return;
    }

    // Handle 'notifications/cancelled' notification
    if (request.method === 'notifications/cancelled' && request.id === undefined) {
      res.status(202).send();
      return;
    }

    // For initialize request, create a new session
    if (request.method === 'initialize') {
      sessionId = randomUUID();
      session = { workspaceId, createdAt: new Date() };
      sessions.set(sessionId, session);
      console.log(`New session: ${sessionId} (workspace: ${workspaceId})`);
    }

    // Session required for non-initialize requests
    if (request.method !== 'initialize' && !session) {
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32600,
          message: 'Session not initialized. Send initialize request first.',
        },
      };
      res.status(400).json(response);
      return;
    }

    // Execute the method
    try {
      const effectiveWorkspaceId = session?.workspaceId || workspaceId;
      const result = await handleMcpMethod(request.method, request.params, effectiveWorkspaceId);

      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: request.id,
        result,
      };

      // Set session ID header for initialize response
      if (request.method === 'initialize' && sessionId) {
        res.setHeader('Mcp-Session-Id', sessionId);
      }

      res.json(response);
    } catch (error) {
      const rpcError = error as { code?: number; message?: string };
      const response: JsonRpcResponse = {
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: rpcError.code || -32603,
          message: rpcError.message || 'Internal error',
        },
      };
      res.status(200).json(response);
    }
    return;
  }

  // Handle batch requests
  const responses: JsonRpcResponse[] = [];

  for (const request of body) {
    // Skip notifications in batch
    if (request.id === undefined) {
      continue;
    }

    try {
      const effectiveWorkspaceId = session?.workspaceId || workspaceId;
      const result = await handleMcpMethod(request.method, request.params, effectiveWorkspaceId);
      responses.push({
        jsonrpc: '2.0',
        id: request.id,
        result,
      });
    } catch (error) {
      const rpcError = error as { code?: number; message?: string };
      responses.push({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: rpcError.code || -32603,
          message: rpcError.message || 'Internal error',
        },
      });
    }
  }

  if (responses.length === 0) {
    res.status(202).send();
  } else {
    res.json(responses);
  }
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    backend: backendUrl,
    activeSessions: sessions.size,
  });
});

// List active workspaces
app.get('/workspaces', (_req: Request, res: Response) => {
  const workspaces = new Set<string>();
  for (const [, session] of sessions) {
    workspaces.add(session.workspaceId);
  }
  res.json({
    workspaces: Array.from(workspaces),
  });
});

// Start server
app.listen(port, () => {
  console.log(`TakaYaka MCP server started on port ${port}`);
  console.log(`Backend: ${backendUrl}`);
  console.log('');
  console.log(`MCP endpoint: http://localhost:${port}/mcp/{workspace-id}`);
  console.log('');
  console.log('To connect Claude Code to a workspace:');
  console.log(`  claude mcp add yakataka --transport http http://localhost:${port}/mcp/{workspace-id}`);
});
