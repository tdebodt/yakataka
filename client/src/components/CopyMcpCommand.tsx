import { useState } from 'react';

interface CopyMcpCommandProps {
  workspaceId: string;
}

export function CopyMcpCommand({ workspaceId }: CopyMcpCommandProps) {
  const [copied, setCopied] = useState(false);

  // The MCP server needs to be run from the local filesystem, not via URL
  // Users should update the path to match their local installation
  const workspaceUrl = `${window.location.origin}/${workspaceId}`;
  const command = `claude mcp add takayaka -- npx tsx /path/to/takayaka/mcp-server/src/index.ts ${workspaceUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-700">
          Configure Claude Code MCP
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
        {command}
      </code>
      <p className="mt-2 text-xs text-gray-500">
        Run this command in your terminal to add TakaYaka to Claude Code.
        Replace <code className="bg-gray-200 px-1 rounded">/path/to/takayaka</code> with your installation path.
      </p>
    </div>
  );
}
