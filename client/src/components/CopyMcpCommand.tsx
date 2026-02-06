import { useState } from 'react';

interface CopyMcpCommandProps {
  projectId: string;
}

export function CopyMcpCommand({ projectId }: CopyMcpCommandProps) {
  const [copied, setCopied] = useState(false);

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const mcpUrl = isLocal
    ? `http://localhost:3002/mcp/${projectId}`
    : `${window.location.origin}/mcp/${projectId}`;
  const mcpCommand = `claude mcp add yakataka --transport http ${mcpUrl}`;

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
    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Connect Claude Code to this project
        </h4>
        <button
          onClick={handleCopy}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-lg transition-colors
            ${copied
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
              : 'bg-primary-100 text-primary-700 hover:bg-primary-200 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50'
            }
          `}
        >
          {copied ? 'Copied!' : 'Copy command'}
        </button>
      </div>
      <code className="block p-2 bg-gray-800 dark:bg-gray-900 text-gray-100 text-xs rounded overflow-x-auto whitespace-nowrap">
        {mcpCommand}
      </code>
      {isLocal && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Make sure the MCP server is running (<code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">npm run dev</code> starts it automatically on port 3002).
        </p>
      )}
    </div>
  );
}
