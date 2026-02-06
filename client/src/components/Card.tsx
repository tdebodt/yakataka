import { useState, useRef, useEffect } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import type { Card as CardType } from '../types';

interface CardProps {
  card: CardType;
  index: number;
  onUpdate: (updates: { title?: string; description?: string }) => void;
  onDelete: () => void;
  onShowDependencies: () => void;
  onShowHistory: () => void;
  hasDependencies: boolean;
  hasUnresolvedDependencies: boolean;
}

export function Card({
  card,
  index,
  onUpdate,
  onDelete,
  onShowDependencies,
  onShowHistory,
  hasDependencies,
  hasUnresolvedDependencies,
}: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editDescription, setEditDescription] = useState(card.description);
  const [showMenu, setShowMenu] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdate({ title: editTitle.trim(), description: editDescription });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') {
      setEditTitle(card.title);
      setEditDescription(card.description);
      setIsEditing(false);
    }
  };

  return (
    <Draggable draggableId={card.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`
            bg-white dark:bg-gray-800 rounded-lg border p-3 mb-2 cursor-grab
            transition-shadow
            ${snapshot.isDragging ? 'shadow-card-hover ring-2 ring-primary-500' : 'shadow-card hover:shadow-card-hover'}
            ${hasUnresolvedDependencies ? 'border-l-4 border-l-amber-400' : 'border-gray-200 dark:border-gray-600'}
          `}
        >
          {isEditing ? (
            <div className="space-y-2">
              <input
                ref={titleRef}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Card title"
              />
              <textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                placeholder="Description (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-2 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditTitle(card.title);
                    setEditDescription(card.description);
                    setIsEditing(false);
                  }}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="group">
              <div className="flex items-start justify-between gap-2">
                <h4
                  className="text-sm font-medium text-gray-900 dark:text-white flex-1 cursor-pointer"
                  onClick={() => setIsEditing(true)}
                >
                  {card.title}
                </h4>
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-opacity p-1"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
                      <button
                        onClick={() => {
                          setIsEditing(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          onShowDependencies();
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Dependencies
                      </button>
                      <button
                        onClick={() => {
                          onShowHistory();
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        History
                      </button>
                      <button
                        onClick={() => {
                          onDelete();
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {card.description && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{card.description}</p>
              )}
              {hasDependencies && (
                <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  <span>{card.dependencies.length} dep{card.dependencies.length !== 1 ? 's' : ''}</span>
                  {hasUnresolvedDependencies && (
                    <span className="text-amber-500 ml-1">(blocked)</span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}
