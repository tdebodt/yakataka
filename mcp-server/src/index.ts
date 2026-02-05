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

// Define tools (project-scoped - no project_id param needed)
const tools = [
  // Project Management
  {
    name: 'get_project',
    description: 'Get the Kanban board showing all tasks organized by workflow status, including task dependencies (blockers)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // Task Management
  {
    name: 'create_card',
    description: 'Create a new task in a workflow status',
    inputSchema: {
      type: 'object',
      properties: {
        column_id: { type: 'string', description: 'ID of the workflow status' },
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description (optional)' },
        position: { type: 'number', description: 'Position within the status (0 = top)' },
      },
      required: ['column_id', 'title'],
    },
  },
  {
    name: 'move_card',
    description: "Move a task to a different workflow status (e.g., from 'To Do' to 'In Progress')",
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
        column_id: { type: 'string', description: 'ID of the target workflow status' },
        position: { type: 'number', description: 'Position within the status (0 = top)' },
      },
      required: ['card_id', 'column_id'],
    },
  },
  {
    name: 'update_card',
    description: "Update a task's title and/or description",
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
        title: { type: 'string', description: 'New task title' },
        description: { type: 'string', description: 'New task description' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'delete_card',
    description: 'Delete a task from the board',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
      },
      required: ['card_id'],
    },
  },

  // Dependency Management
  {
    name: 'add_dependency',
    description: 'Mark a task as blocked by another task (the blocking task must be completed first)',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
        depends_on_card_id: { type: 'string', description: 'ID of the blocking task' },
      },
      required: ['card_id', 'depends_on_card_id'],
    },
  },
  {
    name: 'remove_dependency',
    description: 'Remove a blocker from a task',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
        depends_on_card_id: { type: 'string', description: 'ID of the blocking task to remove' },
      },
      required: ['card_id', 'depends_on_card_id'],
    },
  },
  {
    name: 'get_card_dependencies',
    description: 'Get the tasks that are blocking this task',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
      },
      required: ['card_id'],
    },
  },
  {
    name: 'get_card_dependents',
    description: 'Get the tasks that are blocked by this task',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
      },
      required: ['card_id'],
    },
  },

  // Event History
  {
    name: 'get_history',
    description: 'Get the history of changes to the board (task movements, status changes, etc.)',
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
    description: 'Get the history of changes to a specific task',
    inputSchema: {
      type: 'object',
      properties: {
        card_id: { type: 'string', description: 'ID of the task' },
        limit: { type: 'number', description: 'Maximum number of events to return' },
      },
      required: ['card_id'],
    },
  },
];

// Tool handler function - takes projectId as parameter
async function handleToolCall(projectId: string, name: string, args: Record<string, unknown> | undefined): Promise<unknown> {
  switch (name) {
    // Project Management
    case 'get_project':
      return apiRequest('GET', `/projects/${projectId}`);

    // Task Management
    case 'create_card':
      return apiRequest('POST', `/columns/${args?.column_id}/cards`, {
        project_id: projectId,
        title: args?.title,
        description: args?.description,
        position: args?.position,
      });

    case 'move_card':
      return apiRequest('PUT', `/cards/${args?.card_id}`, {
        project_id: projectId,
        column_id: args?.column_id,
        position: args?.position,
      });

    case 'update_card':
      return apiRequest('PUT', `/cards/${args?.card_id}`, {
        project_id: projectId,
        title: args?.title,
        description: args?.description,
      });

    case 'delete_card':
      await apiRequest('DELETE', `/cards/${args?.card_id}`, {
        project_id: projectId,
      });
      return { success: true };

    // Dependency Management
    case 'add_dependency':
      return apiRequest('POST', `/cards/${args?.card_id}/dependencies`, {
        project_id: projectId,
        depends_on_card_id: args?.depends_on_card_id,
      });

    case 'remove_dependency':
      await apiRequest('DELETE', `/cards/${args?.card_id}/dependencies/${args?.depends_on_card_id}`, {
        project_id: projectId,
      });
      return { success: true };

    case 'get_card_dependencies':
      return apiRequest('GET', `/cards/${args?.card_id}/dependencies?project_id=${projectId}`);

    case 'get_card_dependents':
      return apiRequest('GET', `/cards/${args?.card_id}/dependents?project_id=${projectId}`);

    // Event History
    case 'get_history': {
      const limitParam = args?.limit ? `?limit=${args.limit}` : '';
      return apiRequest('GET', `/projects/${projectId}/events${limitParam}`);
    }

    case 'get_card_history': {
      const params = new URLSearchParams({ project_id: projectId });
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

// Store sessions with project context
interface Session {
  projectId: string;
  createdAt: Date;
}

const sessions = new Map<string, Session>();

// Server info for MCP protocol
const SERVER_INFO = {
  name: 'yakataka',
  version: '1.0.0',
  description: 'Kanban board for tracking tasks. Cards represent tasks to complete, columns represent workflow statuses (e.g., To Do, In Progress, Done). Use get_project to see all tasks and their current status.',
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
  projectId: string
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
        const result = await handleToolCall(projectId, toolName, toolArgs);
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
app.use('/mcp/:projectId', express.json());

// MCP endpoint - project ID in URL path
app.all('/mcp/:projectId', async (req: Request, res: Response) => {
  const { projectId } = req.params;

  if (!projectId || !/^[a-f0-9-]+$/i.test(projectId)) {
    res.status(400).json({ error: 'Invalid project ID' });
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
      session = { projectId, createdAt: new Date() };
      sessions.set(sessionId, session);
      console.log(`New session: ${sessionId} (project: ${projectId})`);
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
      const effectiveProjectId = session?.projectId || projectId;
      const result = await handleMcpMethod(request.method, request.params, effectiveProjectId);

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
      const effectiveProjectId = session?.projectId || projectId;
      const result = await handleMcpMethod(request.method, request.params, effectiveProjectId);
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

// List active projects
app.get('/projects', (_req: Request, res: Response) => {
  const projects = new Set<string>();
  for (const [, session] of sessions) {
    projects.add(session.projectId);
  }
  res.json({
    projects: Array.from(projects),
  });
});

// Start server
app.listen(port, () => {
  console.log(`YakaTaka MCP server started on port ${port}`);
  console.log(`Backend: ${backendUrl}`);
  console.log('');
  console.log(`MCP endpoint: http://localhost:${port}/mcp/{project-id}`);
  console.log('');
  console.log('To connect Claude Code to a project:');
  console.log(`  claude mcp add yakataka --transport http http://localhost:${port}/mcp/{project-id}`);
});
