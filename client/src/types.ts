export interface Card {
  id: string;
  column_id: string;
  title: string;
  description: string;
  position: number;
  dependencies: string[];
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

export interface CardEvent {
  id: number;
  event_type: string;
  event_data: Record<string, unknown>;
  timestamp: string;
}
