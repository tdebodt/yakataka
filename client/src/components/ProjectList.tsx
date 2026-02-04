import { useState } from 'react';
import type { Project } from '../types';
import { Modal } from './Modal';
import { Input } from './Input';
import { Button } from './Button';

interface ProjectListProps {
  projects: Project[];
  selectedProjectId: string | null;
  onSelectProject: (projectId: string) => void;
  onCreateProject: (name: string, description?: string) => Promise<Project>;
}

export function ProjectList({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
}: ProjectListProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setIsSubmitting(true);
    try {
      const project = await onCreateProject(newName.trim(), newDescription.trim() || undefined);
      setNewName('');
      setNewDescription('');
      setIsCreating(false);
      onSelectProject(project.id);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {projects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">No projects yet</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {projects.map((project) => (
              <li key={project.id}>
                <button
                  onClick={() => onSelectProject(project.id)}
                  className={`
                    w-full px-3 py-2 text-left rounded-lg transition-colors
                    ${selectedProjectId === project.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <span className="font-medium text-sm truncate block">
                    {project.name}
                  </span>
                  {project.description && (
                    <span className="text-xs text-gray-500 truncate block">
                      {project.description}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 border-t">
        <Button
          onClick={() => setIsCreating(true)}
          className="w-full"
        >
          + New Project
        </Button>
      </div>

      <Modal
        isOpen={isCreating}
        onClose={() => {
          setIsCreating(false);
          setNewName('');
          setNewDescription('');
        }}
        title="Create Project"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="My Project"
            autoFocus
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Project description..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsCreating(false);
                setNewName('');
                setNewDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
