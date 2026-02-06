import { useEffect, useRef, useState, useCallback } from 'react';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseProjectEventsOptions {
  onEvent?: (eventType: string, data: unknown) => void;
  enabled?: boolean;
}

export function useProjectEvents(
  projectId: string | null,
  options: UseProjectEventsOptions = {}
) {
  const { onEvent, enabled = true } = options;
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const onEventRef = useRef(onEvent);

  // Keep onEvent ref updated
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!projectId || !enabled) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setStatus('connecting');

    const eventSource = new EventSource(`/api/projects/${projectId}/events/stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setStatus('connected');
    };

    eventSource.onerror = () => {
      setStatus('error');
      eventSource.close();

      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    // Listen for the connected event
    eventSource.addEventListener('connected', () => {
      setStatus('connected');
    });

    // Listen for all project events
    const projectEvents = [
      'CardAdded',
      'CardUpdated',
      'CardMoved',
      'CardDeleted',
      'ColumnAdded',
      'ColumnRenamed',
      'ColumnMoved',
      'ColumnDeleted',
      'DependencyAdded',
      'DependencyRemoved',
      'ProjectUpdated',
    ];

    for (const eventType of projectEvents) {
      eventSource.addEventListener(eventType, (event) => {
        try {
          const data = JSON.parse(event.data);
          onEventRef.current?.(eventType, data);
        } catch {
          // Ignore parse errors
        }
      });
    }
  }, [projectId, enabled]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setStatus('disconnected');
    };
  }, [connect]);

  return { status };
}
