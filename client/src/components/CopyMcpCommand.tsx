import { useState } from 'react';

interface CopyMcpCommandProps {
  workspaceId: string;
}

export function CopyMcpCommand({ workspaceId }: CopyMcpCommandProps) {
  const [copied, setCopied] = useState<'server' | 'mcp' | null>(null);

  const workspaceUrl = `${window.location.origin}/${workspaceId}`;
  const mcpPort = 3001;
  const serverCommand = `npx tsx /path/to/takayaka/mcp-server/src/index.ts ${workspaceUrl} --port ${mcpPort}`;
  const mcpCommand = `claude mcp add takayaka --transport sse http://localhost:${mcpPort}/sse`;

  const handleCopy = async (text: string, type: 'server' | 'mcp') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
      <h4 className="text-sm font-medium text-gray-700">
        Configure Claude Code MCP
      </h4>

      {/* Step 1: Start MCP Server */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">1. Start the MCP server</span>
          <button
            onClick={() => handleCopy(serverCommand, 'server')}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors
              ${copied === 'server'
                ? 'bg-green-100 text-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }
            `}
          >
            {copied === 'server' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <code className="block p-2 bg-gray-800 text-gray-100 text-xs rounded overflow-x-auto whitespace-nowrap">
          {serverCommand}
        </code>
      </div>

      {/* Step 2: Add to Claude Code */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-gray-600">2. Add to Claude Code</span>
          <button
            onClick={() => handleCopy(mcpCommand, 'mcp')}
            className={`
              px-2 py-1 text-xs font-medium rounded transition-colors
              ${copied === 'mcp'
                ? 'bg-green-100 text-green-700'
                : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              }
            `}
          >
            {copied === 'mcp' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <code className="block p-2 bg-gray-800 text-gray-100 text-xs rounded overflow-x-auto whitespace-nowrap">
          {mcpCommand}
        </code>
      </div>

      <p className="text-xs text-gray-500">
        Replace <code className="bg-gray-200 px-1 rounded">/path/to/takayaka</code> with your installation path.
        Use <code className="bg-gray-200 px-1 rounded">--port</code> to change the default port (3001).
      </p>
    </div>
  );
}
