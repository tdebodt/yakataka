import { useState } from 'react';
import { Modal } from './Modal';
import type { Card, Column } from '../types';

interface DependencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  card: Card | null;
  columns: Column[];
  allCards: Map<string, Card>;
  onAddDependency: (dependsOnCardId: string) => void;
  onRemoveDependency: (dependsOnCardId: string) => void;
}

export function DependencyModal({
  isOpen,
  onClose,
  card,
  columns,
  allCards,
  onAddDependency,
  onRemoveDependency,
}: DependencyModalProps) {
  const [selectedCardId, setSelectedCardId] = useState('');

  if (!card) return null;

  const currentDependencies = card.dependencies.map((id) => allCards.get(id)).filter(Boolean) as Card[];
  const availableCards = [...allCards.values()].filter(
    (c) => c.id !== card.id && !card.dependencies.includes(c.id)
  );

  const handleAdd = () => {
    if (selectedCardId) {
      onAddDependency(selectedCardId);
      setSelectedCardId('');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Dependencies: ${card.title}`}>
      <div className="space-y-4">
        {/* Current Dependencies */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            This card depends on:
          </h4>
          {currentDependencies.length > 0 ? (
            <ul className="space-y-2">
              {currentDependencies.map((depCard) => {
                const column = columns.find((c) => c.id === depCard.column_id);
                return (
                  <li
                    key={depCard.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-medium">{depCard.title}</span>
                      <span className="text-xs text-gray-400 ml-2">
                        in {column?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => onRemoveDependency(depCard.id)}
                      className="text-red-500 hover:text-red-700 text-xs"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No dependencies</p>
          )}
        </div>

        {/* Add Dependency */}
        {availableCards.length > 0 && (
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Add dependency:
            </h4>
            <div className="flex gap-2">
              <select
                value={selectedCardId}
                onChange={(e) => setSelectedCardId(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select a card...</option>
                {columns.map((column) => {
                  const cardsInColumn = availableCards.filter(
                    (c) => c.column_id === column.id
                  );
                  if (cardsInColumn.length === 0) return null;
                  return (
                    <optgroup key={column.id} label={column.name}>
                      {cardsInColumn.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              <button
                onClick={handleAdd}
                disabled={!selectedCardId}
                className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
