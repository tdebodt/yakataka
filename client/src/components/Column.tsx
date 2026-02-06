import { useState, useRef, useEffect } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { Card } from './Card';
import type { Column as ColumnType, Card as CardType } from '../types';

interface ColumnProps {
  column: ColumnType;
  index: number;
  allCards: Map<string, CardType>;
  doneColumnId: string | null;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddCard: (title: string, description?: string) => void;
  onUpdateCard: (cardId: string, updates: { title?: string; description?: string }) => void;
  onDeleteCard: (cardId: string) => void;
  onShowDependencies: (card: CardType) => void;
  onShowHistory: (card: CardType) => void;
}

export function Column({
  column,
  index,
  allCards,
  doneColumnId,
  onRename,
  onDelete,
  onAddCard,
  onUpdateCard,
  onDeleteCard,
  onShowDependencies,
  onShowHistory,
}: ColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const newCardRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isAddingCard && newCardRef.current) {
      newCardRef.current.focus();
    }
  }, [isAddingCard]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveName = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  const handleAddCard = () => {
    if (newCardTitle.trim()) {
      onAddCard(newCardTitle.trim());
      setNewCardTitle('');
      setIsAddingCard(false);
    }
  };

  const checkUnresolvedDependencies = (card: CardType): boolean => {
    if (card.dependencies.length === 0) return false;
    return card.dependencies.some((depId) => {
      const depCard = allCards.get(depId);
      return depCard && depCard.column_id !== doneColumnId;
    });
  };

  return (
    <Draggable draggableId={`column-${column.id}`} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className="bg-gray-100 dark:bg-gray-700 rounded-xl w-72 flex-shrink-0 flex flex-col max-h-full"
        >
          {/* Column Header */}
          <div
            {...provided.dragHandleProps}
            className="px-3 py-3 flex items-center justify-between"
          >
            {isEditing ? (
              <input
                ref={inputRef}
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveName();
                  if (e.key === 'Escape') {
                    setEditName(column.name);
                    setIsEditing(false);
                  }
                }}
                className="flex-1 px-2 py-1 text-sm font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            ) : (
              <h3
                className="font-semibold text-gray-700 dark:text-gray-200 cursor-pointer hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsEditing(true)}
              >
                {column.name}
              </h3>
            )}
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-400 px-2">{column.cards.length}</span>
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
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
                      Rename
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
          </div>

          {/* Cards */}
          <Droppable droppableId={column.id} type="card">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`
                  flex-1 px-3 pb-3 overflow-y-auto min-h-[100px]
                  ${snapshot.isDraggingOver ? 'bg-primary-50 dark:bg-primary-900/20' : ''}
                `}
              >
                {column.cards.map((card, cardIndex) => (
                  <Card
                    key={card.id}
                    card={card}
                    index={cardIndex}
                    onUpdate={(updates) => onUpdateCard(card.id, updates)}
                    onDelete={() => onDeleteCard(card.id)}
                    onShowDependencies={() => onShowDependencies(card)}
                    onShowHistory={() => onShowHistory(card)}
                    hasDependencies={card.dependencies.length > 0}
                    hasUnresolvedDependencies={checkUnresolvedDependencies(card)}
                  />
                ))}
                {provided.placeholder}

                {/* Add Card */}
                {isAddingCard ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
                    <input
                      ref={newCardRef}
                      type="text"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddCard();
                        if (e.key === 'Escape') {
                          setNewCardTitle('');
                          setIsAddingCard(false);
                        }
                      }}
                      placeholder="Enter card title..."
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleAddCard}
                        className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setNewCardTitle('');
                          setIsAddingCard(false);
                        }}
                        className="px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setIsAddingCard(true)}
                    className="w-full py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    + Add card
                  </button>
                )}
              </div>
            )}
          </Droppable>
        </div>
      )}
    </Draggable>
  );
}
