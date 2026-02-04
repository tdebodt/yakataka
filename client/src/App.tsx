import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectList } from './components/ProjectList';
import { ProjectBoard } from './components/ProjectBoard';
import { CopyMcpCommand } from './components/CopyMcpCommand';
import { useWorkspace, useProject } from './hooks/useApi';

// UUID generator with fallback for non-secure contexts (http://)
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 0);
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function App() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const { projects, loading: loadingProjects, loadProjects, createProject } = useWorkspace(workspaceId || '');
  const {
    project,
    loading: loadingProject,
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
  } = useProject(selectedProjectId);

  // Redirect to new workspace if no workspaceId
  useEffect(() => {
    if (!workspaceId) {
      const newId = generateUUID();
      navigate(`/${newId}`, { replace: true });
    }
  }, [workspaceId, navigate]);

  // Load projects when workspace changes
  useEffect(() => {
    if (workspaceId) {
      loadProjects();
    }
  }, [workspaceId, loadProjects]);

  // Load project when selected
  useEffect(() => {
    if (selectedProjectId) {
      loadProject();
    }
  }, [selectedProjectId, loadProject]);

  // Select first project by default
  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const handleDeleteProject = useCallback(async () => {
    await deleteProject();
    setSelectedProjectId(null);
    await loadProjects();
  }, [deleteProject, loadProjects]);

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className="w-64 border-r flex flex-col bg-white">
        <div className="flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setSelectedProjectId}
            onCreateProject={createProject}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {loadingProjects ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500">Loading...</div>
          </div>
        ) : project ? (
          loadingProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500">Loading project...</div>
            </div>
          ) : (
            <ProjectBoard
              project={project}
              workspaceId={workspaceId}
              onUpdateProject={updateProject}
              onDeleteProject={handleDeleteProject}
              onAddColumn={addColumn}
              onRenameColumn={renameColumn}
              onMoveColumn={moveColumn}
              onDeleteColumn={deleteColumn}
              onAddCard={addCard}
              onUpdateCard={updateCard}
              onMoveCard={moveCard}
              onDeleteCard={deleteCard}
              onAddDependency={addDependency}
              onRemoveDependency={removeDependency}
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md px-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Welcome to TakaYaka
              </h2>
              <p className="text-gray-500 mb-6">
                Create a project to get started with your Kanban board.
              </p>
              <div className="mt-8">
                <CopyMcpCommand workspaceId={workspaceId} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
