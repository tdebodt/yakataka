import { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { fetchCardHistory } from '../hooks/useApi';
import type { Card, CardEvent } from '../types';

interface CardHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  projectId: string;
}

const UPPER_CASE_RE = /([A-Z])/g;
function formatEventType(eventType: string): string {
  return eventType.replace(UPPER_CASE_RE, ' $1').trim();
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function getEventDescription(event: CardEvent): string {
  const data = event.event_data;
  switch (event.event_type) {
    case 'CardAdded':
      return `Created with title "${data.title}"`;
    case 'CardUpdated':
      if (data.title && data.description !== undefined) {
        return `Updated title and description`;
      } else if (data.title) {
        return `Changed title to "${data.title}"`;
      } else if (data.description !== undefined) {
        return `Updated description`;
      }
      return 'Updated';
    case 'CardMoved':
      return `Moved to position ${data.position}`;
    case 'CardDeleted':
      return 'Deleted';
    case 'DependencyAdded':
      return `Added dependency`;
    case 'DependencyRemoved':
      return `Removed dependency`;
    default:
      return event.event_type;
  }
}

export function CardHistoryModal({
  isOpen,
  onClose,
  card,
  projectId,
}: CardHistoryModalProps) {
  const [events, setEvents] = useState<CardEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && card) {
      setLoading(true);
      setError(null);
      fetchCardHistory(projectId, card.id)
        .then(setEvents)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [isOpen, card, projectId]);

  if (!card) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`History: ${card.title}`}>
      <div className="space-y-4">
        {loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading history...</p>
        )}

        {error && (
          <p className="text-sm text-red-500">Error: {error}</p>
        )}

        {!loading && !error && events.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No history available</p>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-3">
            {events.map((event) => {
              const isMcp = event.event_data._source === 'mcp';
              return (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatEventType(event.event_type)}
                      </span>
                      {isMcp && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          Claude Code
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                      {getEventDescription(event)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatTimestamp(event.timestamp)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
