import { v4 as uuidv4 } from 'uuid';
import { eventStore } from '../../infrastructure/eventStore.js';
import type {
  Project,
  Column,
  Card,
  ProjectEvent,
  ProjectCreatedEvent,
  ProjectRenamedEvent,
  ProjectDescriptionUpdatedEvent,
  ProjectDeletedEvent,
  ColumnAddedEvent,
  ColumnRenamedEvent,
  ColumnMovedEvent,
  ColumnDeletedEvent,
  CardAddedEvent,
  CardUpdatedEvent,
  CardMovedEvent,
  CardDeletedEvent,
  DependencyAddedEvent,
  DependencyRemovedEvent
} from '../../types.js';

interface ProjectState {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  deleted: boolean;
  columns: Map<string, Column>;
  cards: Map<string, Card>;
}

function initialState(): ProjectState {
  return {
    id: '',
    workspace_id: '',
    name: '',
    description: '',
    deleted: false,
    columns: new Map(),
    cards: new Map()
  };
}

function applyEvent(state: ProjectState, event: ProjectEvent): ProjectState {
  switch (event.event_type) {
    case 'ProjectCreated':
      return {
        ...state,
        id: event.event_data.project_id,
        workspace_id: event.event_data.workspace_id,
        name: event.event_data.name,
        description: event.event_data.description
      };

    case 'ProjectRenamed':
      return { ...state, name: event.event_data.name };

    case 'ProjectDescriptionUpdated':
      return { ...state, description: event.event_data.description };

    case 'ProjectDeleted':
      return { ...state, deleted: true };

    case 'ColumnAdded': {
      const columns = new Map(state.columns);
      columns.set(event.event_data.column_id, {
        id: event.event_data.column_id,
        project_id: state.id,
        name: event.event_data.name,
        position: event.event_data.position,
        cards: []
      });
      return { ...state, columns };
    }

    case 'ColumnRenamed': {
      const columns = new Map(state.columns);
      const col = columns.get(event.event_data.column_id);
      if (col) {
        columns.set(event.event_data.column_id, { ...col, name: event.event_data.name });
      }
      return { ...state, columns };
    }

    case 'ColumnMoved': {
      const columns = new Map(state.columns);
      const col = columns.get(event.event_data.column_id);
      if (col) {
        columns.set(event.event_data.column_id, { ...col, position: event.event_data.position });
      }
      return { ...state, columns };
    }

    case 'ColumnDeleted': {
      const columns = new Map(state.columns);
      columns.delete(event.event_data.column_id);
      return { ...state, columns };
    }

    case 'CardAdded': {
      const cards = new Map(state.cards);
      cards.set(event.event_data.card_id, {
        id: event.event_data.card_id,
        column_id: event.event_data.column_id,
        title: event.event_data.title,
        description: event.event_data.description,
        position: event.event_data.position,
        dependencies: []
      });
      return { ...state, cards };
    }

    case 'CardUpdated': {
      const cards = new Map(state.cards);
      const card = cards.get(event.event_data.card_id);
      if (card) {
        cards.set(event.event_data.card_id, {
          ...card,
          title: event.event_data.title ?? card.title,
          description: event.event_data.description ?? card.description
        });
      }
      return { ...state, cards };
    }

    case 'CardMoved': {
      const cards = new Map(state.cards);
      const card = cards.get(event.event_data.card_id);
      if (card) {
        cards.set(event.event_data.card_id, {
          ...card,
          column_id: event.event_data.column_id,
          position: event.event_data.position
        });
      }
      return { ...state, cards };
    }

    case 'CardDeleted': {
      const cards = new Map(state.cards);
      cards.delete(event.event_data.card_id);
      return { ...state, cards };
    }

    case 'DependencyAdded': {
      const cards = new Map(state.cards);
      const card = cards.get(event.event_data.card_id);
      if (card && !card.dependencies.includes(event.event_data.depends_on_card_id)) {
        cards.set(event.event_data.card_id, {
          ...card,
          dependencies: [...card.dependencies, event.event_data.depends_on_card_id]
        });
      }
      return { ...state, cards };
    }

    case 'DependencyRemoved': {
      const cards = new Map(state.cards);
      const card = cards.get(event.event_data.card_id);
      if (card) {
        cards.set(event.event_data.card_id, {
          ...card,
          dependencies: card.dependencies.filter(id => id !== event.event_data.depends_on_card_id)
        });
      }
      return { ...state, cards };
    }

    default:
      return state;
  }
}

export class ProjectAggregate {
  private state: ProjectState = initialState();
  private version = 0;

  constructor(private readonly projectId: string) {}

  load(): this {
    const events = eventStore.getEvents('project', this.projectId);
    for (const event of events) {
      this.state = applyEvent(this.state, event as ProjectEvent);
      this.version = event.version;
    }
    return this;
  }

  private appendEvent(eventType: string, eventData: Record<string, unknown>, source?: string): void {
    this.version += 1;
    const finalEventData = source ? { ...eventData, _source: source } : eventData;
    const event = {
      aggregate_type: 'project' as const,
      aggregate_id: this.projectId,
      event_type: eventType,
      event_data: finalEventData,
      version: this.version
    };
    eventStore.append(event);
    this.state = applyEvent(this.state, { ...event, timestamp: new Date().toISOString() } as ProjectEvent);
  }

  // Project operations
  create(workspaceId: string, name: string, description: string): Project {
    const data: ProjectCreatedEvent['event_data'] = {
      project_id: this.projectId,
      workspace_id: workspaceId,
      name,
      description
    };
    this.appendEvent('ProjectCreated', data);

    // Add default columns
    const defaultColumns = ['To Do', 'In Progress', 'Done'];
    defaultColumns.forEach((colName, index) => {
      const columnId = uuidv4();
      this.appendEvent('ColumnAdded', { column_id: columnId, name: colName, position: index });
    });

    return this.toProject();
  }

  rename(name: string): void {
    const data: ProjectRenamedEvent['event_data'] = { name };
    this.appendEvent('ProjectRenamed', data);
  }

  updateDescription(description: string): void {
    const data: ProjectDescriptionUpdatedEvent['event_data'] = { description };
    this.appendEvent('ProjectDescriptionUpdated', data);
  }

  delete(): void {
    this.appendEvent('ProjectDeleted', {});
  }

  // Column operations
  addColumn(name: string, position?: number): Column {
    const columnId = uuidv4();
    const pos = position ?? this.state.columns.size;
    const data: ColumnAddedEvent['event_data'] = { column_id: columnId, name, position: pos };
    this.appendEvent('ColumnAdded', data);
    return this.state.columns.get(columnId)!;
  }

  renameColumn(columnId: string, name: string): void {
    if (!this.state.columns.has(columnId)) {
      throw new Error('Column not found');
    }
    const data: ColumnRenamedEvent['event_data'] = { column_id: columnId, name };
    this.appendEvent('ColumnRenamed', data);
  }

  moveColumn(columnId: string, position: number): void {
    if (!this.state.columns.has(columnId)) {
      throw new Error('Column not found');
    }
    const data: ColumnMovedEvent['event_data'] = { column_id: columnId, position };
    this.appendEvent('ColumnMoved', data);
  }

  deleteColumn(columnId: string): void {
    if (!this.state.columns.has(columnId)) {
      throw new Error('Column not found');
    }
    // Move cards to first column
    const firstColumn = [...this.state.columns.values()].sort((a, b) => a.position - b.position)[0];
    if (firstColumn && firstColumn.id !== columnId) {
      for (const card of this.state.cards.values()) {
        if (card.column_id === columnId) {
          this.moveCard(card.id, firstColumn.id);
        }
      }
    }
    const data: ColumnDeletedEvent['event_data'] = { column_id: columnId };
    this.appendEvent('ColumnDeleted', data);
  }

  // Card operations
  addCard(columnId: string, title: string, description: string = '', position?: number, source?: string): Card {
    if (!this.state.columns.has(columnId)) {
      throw new Error('Column not found');
    }
    const cardId = uuidv4();
    const cardsInColumn = [...this.state.cards.values()].filter(c => c.column_id === columnId);
    const pos = position ?? cardsInColumn.length;
    const data: CardAddedEvent['event_data'] = {
      card_id: cardId,
      column_id: columnId,
      title,
      description,
      position: pos
    };
    this.appendEvent('CardAdded', data, source);
    return this.state.cards.get(cardId)!;
  }

  updateCard(cardId: string, updates: { title?: string; description?: string }, source?: string): void {
    if (!this.state.cards.has(cardId)) {
      throw new Error('Card not found');
    }
    const data: CardUpdatedEvent['event_data'] = { card_id: cardId, ...updates };
    this.appendEvent('CardUpdated', data, source);
  }

  moveCard(cardId: string, columnId: string, position?: number, source?: string): void {
    if (!this.state.cards.has(cardId)) {
      throw new Error('Card not found');
    }
    if (!this.state.columns.has(columnId)) {
      throw new Error('Column not found');
    }
    const cardsInColumn = [...this.state.cards.values()].filter(c => c.column_id === columnId && c.id !== cardId);
    const pos = position ?? cardsInColumn.length;
    const data: CardMovedEvent['event_data'] = { card_id: cardId, column_id: columnId, position: pos };
    this.appendEvent('CardMoved', data, source);
  }

  deleteCard(cardId: string, source?: string): void {
    if (!this.state.cards.has(cardId)) {
      throw new Error('Card not found');
    }
    // Remove dependencies referencing this card
    for (const card of this.state.cards.values()) {
      if (card.dependencies.includes(cardId)) {
        this.removeDependency(card.id, cardId, source);
      }
    }
    const data: CardDeletedEvent['event_data'] = { card_id: cardId };
    this.appendEvent('CardDeleted', data, source);
  }

  // Dependency operations
  addDependency(cardId: string, dependsOnCardId: string, source?: string): void {
    if (!this.state.cards.has(cardId)) {
      throw new Error('Card not found');
    }
    if (!this.state.cards.has(dependsOnCardId)) {
      throw new Error('Dependency card not found');
    }
    if (cardId === dependsOnCardId) {
      throw new Error('Card cannot depend on itself');
    }
    const data: DependencyAddedEvent['event_data'] = { card_id: cardId, depends_on_card_id: dependsOnCardId };
    this.appendEvent('DependencyAdded', data, source);
  }

  removeDependency(cardId: string, dependsOnCardId: string, source?: string): void {
    if (!this.state.cards.has(cardId)) {
      throw new Error('Card not found');
    }
    const data: DependencyRemovedEvent['event_data'] = { card_id: cardId, depends_on_card_id: dependsOnCardId };
    this.appendEvent('DependencyRemoved', data, source);
  }

  // Queries
  exists(): boolean {
    return this.state.id !== '' && !this.state.deleted;
  }

  isDeleted(): boolean {
    return this.state.deleted;
  }

  getCard(cardId: string): Card | undefined {
    return this.state.cards.get(cardId);
  }

  getColumn(columnId: string): Column | undefined {
    return this.state.columns.get(columnId);
  }

  toProject(): Project {
    const columns = [...this.state.columns.values()]
      .sort((a, b) => a.position - b.position)
      .map(col => ({
        ...col,
        cards: [...this.state.cards.values()]
          .filter(card => card.column_id === col.id)
          .sort((a, b) => a.position - b.position)
      }));

    return {
      id: this.state.id,
      workspace_id: this.state.workspace_id,
      name: this.state.name,
      description: this.state.description,
      columns
    };
  }
}

export function loadProject(projectId: string): ProjectAggregate {
  return new ProjectAggregate(projectId).load();
}

export function createProject(workspaceId: string, name: string, description: string = ''): Project {
  const projectId = uuidv4();
  const aggregate = new ProjectAggregate(projectId);
  return aggregate.create(workspaceId, name, description);
}

export function getProjectsByWorkspace(workspaceId: string): Project[] {
  const projectIds = eventStore.getProjectIdsByWorkspace(workspaceId);
  return projectIds
    .map(id => new ProjectAggregate(id).load())
    .filter(agg => agg.exists())
    .map(agg => agg.toProject());
}
