import { useState, useCallback } from 'react';
import type { Project, Card, Column } from '../types';

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
    if (!projectId) return;
    await fetchApi(`/columns/${columnId}`, {
      method: 'PUT',
      body: JSON.stringify({ project_id: projectId, position }),
    });
    await loadProject();
  }, [projectId, loadProject]);

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
    if (!projectId) return;
    await fetchApi(`/cards/${cardId}`, {
      method: 'PUT',
      body: JSON.stringify({ project_id: projectId, column_id: columnId, position }),
    });
    await loadProject();
  }, [projectId, loadProject]);

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
