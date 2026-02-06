import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProjectList } from './components/ProjectList';
import { ProjectBoard } from './components/ProjectBoard';
import { useWorkspace, useProject } from './hooks/useApi';
import { generateUUID } from './utils/uuid';

export function App() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [userSelectedProjectId, setUserSelectedProjectId] = useState<string | null>(null);
  const { projects, loading: loadingProjects, loadProjects, createProject } = useWorkspace(workspaceId || '');

  // Derive effective project ID: user selection, or fall back to first project
  const selectedProjectId = userSelectedProjectId ?? projects[0]?.id ?? null;

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

  const handleDeleteProject = useCallback(async () => {
    await deleteProject();
    setUserSelectedProjectId(null);
    await loadProjects();
  }, [deleteProject, loadProjects]);

  if (!workspaceId) {
    return null;
  }

  return (
    <div className="h-screen flex bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <div className="flex-1 overflow-hidden">
          <ProjectList
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSelectProject={setUserSelectedProjectId}
            onCreateProject={createProject}
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {loadingProjects ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Loading...</div>
          </div>
        ) : project ? (
          loadingProject ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-gray-500 dark:text-gray-400">Loading project...</div>
            </div>
          ) : (
            <ProjectBoard
              project={project}
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
              <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to TakaYaka
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Create a project to get started with your Kanban board.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
