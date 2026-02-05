import { useState, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, DropResult } from '@hello-pangea/dnd';
import { Column } from './Column';
import { DependencyModal } from './DependencyModal';
import { CardHistoryModal } from './CardHistoryModal';
import { CopyMcpCommand } from './CopyMcpCommand';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import type { Project, Card as CardType } from '../types';

interface ProjectBoardProps {
  project: Project;
  onUpdateProject: (updates: { name?: string; description?: string }) => void;
  onDeleteProject: () => void;
  onAddColumn: (name: string) => void;
  onRenameColumn: (columnId: string, name: string) => void;
  onMoveColumn: (columnId: string, position: number) => void;
  onDeleteColumn: (columnId: string) => void;
  onAddCard: (columnId: string, title: string, description?: string) => void;
  onUpdateCard: (cardId: string, updates: { title?: string; description?: string }) => void;
  onMoveCard: (cardId: string, columnId: string, position?: number) => void;
  onDeleteCard: (cardId: string) => void;
  onAddDependency: (cardId: string, dependsOnCardId: string) => void;
  onRemoveDependency: (cardId: string, dependsOnCardId: string) => void;
}

export function ProjectBoard({
  project,
  onUpdateProject,
  onDeleteProject,
  onAddColumn,
  onRenameColumn,
  onMoveColumn,
  onDeleteColumn,
  onAddCard,
  onUpdateCard,
  onMoveCard,
  onDeleteCard,
  onAddDependency,
  onRemoveDependency,
}: ProjectBoardProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(project.name);
  const [showSettings, setShowSettings] = useState(false);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [dependencyCard, setDependencyCard] = useState<CardType | null>(null);
  const [historyCard, setHistoryCard] = useState<CardType | null>(null);

  // Build a map of all cards for quick lookup
  const allCards = useMemo(() => {
    const map = new Map<string, CardType>();
    project.columns.forEach((col) => {
      col.cards.forEach((card) => {
        map.set(card.id, card);
      });
    });
    return map;
  }, [project.columns]);

  // Find the "Done" column (last column by convention)
  const doneColumnId = useMemo(() => {
    const sorted = [...project.columns].sort((a, b) => a.position - b.position);
    return sorted.length > 0 ? sorted[sorted.length - 1].id : null;
  }, [project.columns]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source, draggableId, type } = result;

      if (!destination) return;
      if (destination.droppableId === source.droppableId && destination.index === source.index) {
        return;
      }

      if (type === 'column') {
        // Moving a column
        const columnId = draggableId.replace('column-', '');
        onMoveColumn(columnId, destination.index);
      } else {
        // Moving a card
        onMoveCard(draggableId, destination.droppableId, destination.index);
      }
    },
    [onMoveColumn, onMoveCard]
  );

  const handleSaveTitle = () => {
    if (editTitle.trim() && editTitle.trim() !== project.name) {
      onUpdateProject({ name: editTitle.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center gap-4">
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleSaveTitle}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveTitle();
                if (e.key === 'Escape') {
                  setEditTitle(project.name);
                  setIsEditingTitle(false);
                }
              }}
              className="text-xl font-bold px-2 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
              autoFocus
            />
          ) : (
            <h1
              className="text-xl font-bold text-gray-900 cursor-pointer hover:text-primary-600"
              onClick={() => setIsEditingTitle(true)}
            >
              {project.name}
            </h1>
          )}
          {project.description && (
            <span className="text-sm text-gray-500">{project.description}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
            <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </Button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-x-auto bg-gray-50 p-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="column" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-4 h-full items-start"
              >
                {project.columns
                  .sort((a, b) => a.position - b.position)
                  .map((column, index) => (
                    <Column
                      key={column.id}
                      column={column}
                      index={index}
                      allCards={allCards}
                      doneColumnId={doneColumnId}
                      onRename={(name) => onRenameColumn(column.id, name)}
                      onDelete={() => onDeleteColumn(column.id)}
                      onAddCard={(title, desc) => onAddCard(column.id, title, desc)}
                      onUpdateCard={onUpdateCard}
                      onDeleteCard={onDeleteCard}
                      onShowDependencies={setDependencyCard}
                      onShowHistory={setHistoryCard}
                    />
                  ))}
                {provided.placeholder}

                {/* Add Column Button */}
                {isAddingColumn ? (
                  <div className="bg-gray-100 rounded-xl w-72 flex-shrink-0 p-3">
                    <Input
                      value={newColumnName}
                      onChange={(e) => setNewColumnName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddColumn();
                        if (e.key === 'Escape') {
                          setNewColumnName('');
                          setIsAddingColumn(false);
                        }
                      }}
                      placeholder="Column name..."
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" onClick={handleAddColumn}>
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setNewColumnName('');
                          setIsAddingColumn(false);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingColumn(true)}
                    className="bg-gray-200 hover:bg-gray-300 rounded-xl w-72 flex-shrink-0 h-12 flex items-center justify-center text-gray-600 transition-colors"
                  >
                    + Add column
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        title="Project Settings"
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={project.description}
              onChange={(e) => onUpdateProject({ description: e.target.value })}
              placeholder="Project description..."
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={3}
            />
          </div>

          <div className="border-t pt-4">
            <CopyMcpCommand projectId={project.id} />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-red-600 mb-2">Danger Zone</h4>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to delete this project?')) {
                  onDeleteProject();
                  setShowSettings(false);
                }
              }}
            >
              Delete Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* Dependency Modal */}
      <DependencyModal
        isOpen={dependencyCard !== null}
        onClose={() => setDependencyCard(null)}
        card={dependencyCard}
        columns={project.columns}
        allCards={allCards}
        onAddDependency={(depId) => {
          if (dependencyCard) {
            onAddDependency(dependencyCard.id, depId);
          }
        }}
        onRemoveDependency={(depId) => {
          if (dependencyCard) {
            onRemoveDependency(dependencyCard.id, depId);
          }
        }}
      />

      {/* History Modal */}
      <CardHistoryModal
        isOpen={historyCard !== null}
        onClose={() => setHistoryCard(null)}
        card={historyCard}
        projectId={project.id}
      />
    </div>
  );
}
