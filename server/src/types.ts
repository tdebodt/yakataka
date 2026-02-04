// Shared types for the TakaYaka Kanban application

export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  dependencies: string[]; // card_ids this card depends on
}

export interface Column {
  id: string;
  project_id: string;
  name: string;
  position: number;
  cards: Card[];
}

export interface Project {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  columns: Column[];
}

export interface Workspace {
  id: string;
  created_at: string;
}

// Event types
export type AggregateType = 'workspace' | 'project';

export interface BaseEvent {
  id?: number;
  aggregate_type: AggregateType;
  aggregate_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  version: number;
  timestamp: string;
}

// Workspace Events
export interface WorkspaceCreatedEvent extends BaseEvent {
  aggregate_type: 'workspace';
  event_type: 'WorkspaceCreated';
  event_data: {
    workspace_id: string;
  };
}

// Project Events
export interface ProjectCreatedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ProjectCreated';
  event_data: {
    project_id: string;
    workspace_id: string;
    name: string;
    description: string;
  };
}

export interface ProjectRenamedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ProjectRenamed';
  event_data: {
    name: string;
  };
}

export interface ProjectDescriptionUpdatedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ProjectDescriptionUpdated';
  event_data: {
    description: string;
  };
}

export interface ProjectDeletedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ProjectDeleted';
  event_data: Record<string, never>;
}

export interface ColumnAddedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ColumnAdded';
  event_data: {
    column_id: string;
    name: string;
    position: number;
  };
}

export interface ColumnRenamedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ColumnRenamed';
  event_data: {
    column_id: string;
    name: string;
  };
}

export interface ColumnMovedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ColumnMoved';
  event_data: {
    column_id: string;
    position: number;
  };
}

export interface ColumnDeletedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'ColumnDeleted';
  event_data: {
    column_id: string;
  };
}

export interface CardAddedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'CardAdded';
  event_data: {
    card_id: string;
    column_id: string;
    title: string;
    description: string;
    position: number;
  };
}

export interface CardUpdatedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'CardUpdated';
  event_data: {
    card_id: string;
    title?: string;
    description?: string;
  };
}

export interface CardMovedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'CardMoved';
  event_data: {
    card_id: string;
    column_id: string;
    position: number;
  };
}

export interface CardDeletedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'CardDeleted';
  event_data: {
    card_id: string;
  };
}

export interface DependencyAddedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'DependencyAdded';
  event_data: {
    card_id: string;
    depends_on_card_id: string;
  };
}

export interface DependencyRemovedEvent extends BaseEvent {
  aggregate_type: 'project';
  event_type: 'DependencyRemoved';
  event_data: {
    card_id: string;
    depends_on_card_id: string;
  };
}

export type WorkspaceEvent = WorkspaceCreatedEvent;

export type ProjectEvent =
  | ProjectCreatedEvent
  | ProjectRenamedEvent
  | ProjectDescriptionUpdatedEvent
  | ProjectDeletedEvent
  | ColumnAddedEvent
  | ColumnRenamedEvent
  | ColumnMovedEvent
  | ColumnDeletedEvent
  | CardAddedEvent
  | CardUpdatedEvent
  | CardMovedEvent
  | CardDeletedEvent
  | DependencyAddedEvent
  | DependencyRemovedEvent;

export type DomainEvent = WorkspaceEvent | ProjectEvent;
