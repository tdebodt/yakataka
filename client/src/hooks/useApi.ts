import { useState, useCallback, useRef, useEffect } from 'react';
import type { Project, Card, Column, CardEvent } from '../types';
import { useProjectEvents } from './useProjectEvents';

const API_BASE = '/api';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API error: ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export async function fetchCardHistory(projectId: string, cardId: string): Promise<CardEvent[]> {
  return fetchApi<CardEvent[]>(`/cards/${cardId}/events?project_id=${projectId}`);
}

export function useWorkspace(workspaceId: string) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Project[]>(`/workspaces/${workspaceId}/projects`);
      setProjects(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const createProject = useCallback(async (name: string, description?: string) => {
    const project = await fetchApi<Project>(`/workspaces/${workspaceId}/projects`, {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
    setProjects((prev) => [...prev, project]);
    return project;
  }, [workspaceId]);

  return { projects, loading, error, loadProjects, createProject };
}

export function useProject(projectId: string | null) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadProjectRef = useRef<() => Promise<void>>();

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchApi<Project>(`/projects/${projectId}`);
      setProject(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Keep ref updated for SSE callback
  useEffect(() => {
    loadProjectRef.current = loadProject;
  }, [loadProject]);

  // Subscribe to SSE events for real-time updates
  const { status: sseStatus } = useProjectEvents(projectId, {
    onEvent: useCallback(() => {
      // Refetch project on any event
      loadProjectRef.current?.();
    }, []),
  });

  const updateProject = useCallback(async (updates: { name?: string; description?: string }) => {
    if (!projectId) return;
    const updated = await fetchApi<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    setProject(updated);
    return updated;
  }, [projectId]);

  const deleteProject = useCallback(async () => {
    if (!projectId) return;
    await fetchApi(`/projects/${projectId}`, { method: 'DELETE' });
    setProject(null);
  }, [projectId]);

  // Column operations
  const addColumn = useCallback(async (name: string, position?: number) => {
    if (!projectId) return;
    await fetchApi<Column>(`/projects/${projectId}/columns`, {
      method: 'POST',
      body: JSON.stringify({ name, position }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  const renameColumn = useCallback(async (columnId: string, name: string) => {
    if (!projectId) return;
    await fetchApi(`/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ project_id: projectId, name }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  const moveColumn = useCallback(async (columnId: string, position: number) => {
    if (!projectId || !project) return;

    // Optimistically update local state
    const previousProject = project;
    setProject((prev) => {
      if (!prev) return prev;

      const columnIndex = prev.columns.findIndex((c) => c.id === columnId);
      if (columnIndex === -1) return prev;

      const newColumns = [...prev.columns];
      const [column] = newColumns.splice(columnIndex, 1);
      newColumns.splice(position, 0, column);

      // Recalculate positions
      return {
        ...prev,
        columns: newColumns.map((c, idx) => ({ ...c, position: idx })),
      };
    });

    try {
      await fetchApi(`/columns/${columnId}`, {
        method: 'PUT',
        body: JSON.stringify({ project_id: projectId, position }),
      });
      await loadProject();
    } catch {
      setProject(previousProject);
    }
  }, [projectId, project, loadProject]);

  const deleteColumn = useCallback(async (columnId: string) => {
    if (!projectId) return;
    await fetchApi(`/columns/${columnId}`, {
      method: 'DELETE',
      body: JSON.stringify({ project_id: projectId }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  // Card operations
  const addCard = useCallback(async (columnId: string, title: string, description?: string) => {
    if (!projectId) return;
    await fetchApi<Card>(`/columns/${columnId}/cards`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, title, description }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  const updateCard = useCallback(async (cardId: string, updates: { title?: string; description?: string }) => {
    if (!projectId) return;
    await fetchApi(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify({ project_id: projectId, ...updates }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  const moveCard = useCallback(async (cardId: string, columnId: string, position?: number) => {
    if (!projectId || !project) return;

    // Optimistically update local state
    const previousProject = project;
    setProject((prev) => {
      if (!prev) return prev;

      // Find the card and its source column
      let card: Card | undefined;
      let sourceColumnId: string | undefined;

      for (const col of prev.columns) {
        const found = col.cards.find((c) => c.id === cardId);
        if (found) {
          card = found;
          sourceColumnId = col.id;
          break;
        }
      }

      if (!card || !sourceColumnId) return prev;

      // Create new columns array with the card moved
      const newColumns = prev.columns.map((col) => {
        // Remove card from source column
        if (col.id === sourceColumnId) {
          return {
            ...col,
            cards: col.cards.filter((c) => c.id !== cardId),
          };
        }
        // Add card to destination column
        if (col.id === columnId) {
          const newCards = [...col.cards];
          const insertAt = position !== undefined ? position : newCards.length;
          newCards.splice(insertAt, 0, { ...card!, column_id: columnId });
          // Recalculate positions
          return {
            ...col,
            cards: newCards.map((c, idx) => ({ ...c, position: idx })),
          };
        }
        return col;
      });

      // Recalculate positions in source column too
      const finalColumns = newColumns.map((col) => {
        if (col.id === sourceColumnId && col.id !== columnId) {
          return {
            ...col,
            cards: col.cards.map((c, idx) => ({ ...c, position: idx })),
          };
        }
        return col;
      });

      return { ...prev, columns: finalColumns };
    });

    try {
      await fetchApi(`/cards/${cardId}`, {
        method: 'PUT',
        body: JSON.stringify({ project_id: projectId, column_id: columnId, position }),
      });
      // Reload to get the authoritative state from server
      await loadProject();
    } catch {
      // Revert on error
      setProject(previousProject);
    }
  }, [projectId, project, loadProject]);

  const deleteCard = useCallback(async (cardId: string) => {
    if (!projectId) return;
    await fetchApi(`/cards/${cardId}`, {
      method: 'DELETE',
      body: JSON.stringify({ project_id: projectId }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  // Dependency operations
  const addDependency = useCallback(async (cardId: string, dependsOnCardId: string) => {
    if (!projectId) return;
    await fetchApi(`/cards/${cardId}/dependencies`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, depends_on_card_id: dependsOnCardId }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  const removeDependency = useCallback(async (cardId: string, dependsOnCardId: string) => {
    if (!projectId) return;
    await fetchApi(`/cards/${cardId}/dependencies/${dependsOnCardId}`, {
      method: 'DELETE',
      body: JSON.stringify({ project_id: projectId }),
    });
    await loadProject();
  }, [projectId, loadProject]);

  return {
    project,
    loading,
    error,
    sseStatus,
    loadProject,
    updateProject,
    deleteProject,
    addColumn,
    renameColumn,
    moveColumn,
    deleteColumn,
    addCard,
    updateCard,
    moveCard,
    deleteCard,
    addDependency,
    removeDependency,
  };
}
