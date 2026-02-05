import { useState } from 'react';

interface CopyMcpCommandProps {
  projectId: string;
}

export function CopyMcpCommand({ projectId }: CopyMcpCommandProps) {
  const [copied, setCopied] = useState(false);

  const mcpPort = 3002;
  const mcpCommand = `claude mcp add yakataka --transport http http://localhost:${mcpPort}/mcp/${projectId}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mcpCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">
          Connect Claude Code to this project
        </h4>
        <button
          onClick={handleCopy}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
            ${copied
              ? 'bg-green-100 text-green-700'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
            }
          `}
        >
          {copied ? 'Copied!' : 'Copy command'}
        </button>
      </div>
      <code className="block p-2 bg-gray-800 text-gray-100 text-xs rounded overflow-x-auto whitespace-nowrap">
        {mcpCommand}
      </code>
      <p className="text-xs text-gray-500">
        Make sure the MCP server is running (<code className="bg-gray-200 px-1 rounded">npm run dev</code> starts it automatically on port {mcpPort}).
      </p>
    </div>
  );
}
