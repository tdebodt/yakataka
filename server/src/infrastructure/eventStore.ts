import db from '../db/index.js';
import type { BaseEvent, AggregateType, DomainEvent } from '../types.js';
import { eventBroadcaster } from './eventBroadcaster.js';

interface EventRow {
  id: number;
  aggregate_type: string;
  aggregate_id: string;
  event_type: string;
  event_data: string;
  version: number;
  timestamp: string;
}

export class EventStore {
  private insertStmt = db.prepare(`
    INSERT INTO events (aggregate_type, aggregate_id, event_type, event_data, version, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  private getEventsStmt = db.prepare(`
    SELECT * FROM events
    WHERE aggregate_type = ? AND aggregate_id = ?
    ORDER BY version ASC
  `);

  private getLatestVersionStmt = db.prepare(`
    SELECT MAX(version) as version FROM events
    WHERE aggregate_type = ? AND aggregate_id = ?
  `);

  private getEventsByWorkspaceStmt = db.prepare(`
    SELECT e.* FROM events e
    WHERE (e.aggregate_type = 'workspace' AND e.aggregate_id = ?)
       OR (e.aggregate_type = 'project' AND e.aggregate_id IN (
         SELECT json_extract(event_data, '$.project_id') FROM events
         WHERE aggregate_type = 'project'
         AND event_type = 'ProjectCreated'
         AND json_extract(event_data, '$.workspace_id') = ?
       ))
    ORDER BY e.timestamp ASC
  `);

  private getProjectIdsByWorkspaceStmt = db.prepare(`
    SELECT DISTINCT aggregate_id FROM events
    WHERE aggregate_type = 'project'
    AND event_type = 'ProjectCreated'
    AND json_extract(event_data, '$.workspace_id') = ?
  `);

  private getCardEventsStmt = db.prepare(`
    SELECT * FROM events
    WHERE aggregate_type = 'project'
    AND aggregate_id = ?
    AND (
      json_extract(event_data, '$.card_id') = ?
      OR json_extract(event_data, '$.depends_on_card_id') = ?
    )
    ORDER BY timestamp DESC
  `);

  append(event: Omit<BaseEvent, 'id' | 'timestamp'>): BaseEvent {
    const timestamp = new Date().toISOString();

    try {
      this.insertStmt.run(
        event.aggregate_type,
        event.aggregate_id,
        event.event_type,
        JSON.stringify(event.event_data),
        event.version,
        timestamp
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
        throw new Error(`Concurrency conflict: version ${event.version} already exists`);
      }
      throw err;
    }

    const savedEvent: DomainEvent = {
      ...event,
      timestamp
    } as DomainEvent;

    // Broadcast to SSE clients if this is a project event
    if (event.aggregate_type === 'project') {
      eventBroadcaster.broadcast(event.aggregate_id, savedEvent);
    }

    return savedEvent;
  }

  getEvents(aggregateType: AggregateType, aggregateId: string): DomainEvent[] {
    const rows = this.getEventsStmt.all(aggregateType, aggregateId) as EventRow[];
    return rows.map(this.rowToEvent);
  }

  getLatestVersion(aggregateType: AggregateType, aggregateId: string): number {
    const result = this.getLatestVersionStmt.get(aggregateType, aggregateId) as { version: number | null };
    return result.version ?? 0;
  }

  getWorkspaceEvents(workspaceId: string, limit?: number): DomainEvent[] {
    const rows = this.getEventsByWorkspaceStmt.all(workspaceId, workspaceId) as EventRow[];
    const events = rows.map(this.rowToEvent);
    return limit ? events.slice(-limit) : events;
  }

  getProjectIdsByWorkspace(workspaceId: string): string[] {
    const rows = this.getProjectIdsByWorkspaceStmt.all(workspaceId) as { aggregate_id: string }[];
    return rows.map(r => r.aggregate_id);
  }

  getCardEvents(projectId: string, cardId: string, limit?: number): DomainEvent[] {
    const rows = this.getCardEventsStmt.all(projectId, cardId, cardId) as EventRow[];
    const events = rows.map(this.rowToEvent);
    return limit ? events.slice(0, limit) : events;
  }

  private rowToEvent(row: EventRow): DomainEvent {
    return {
      id: row.id,
      aggregate_type: row.aggregate_type as AggregateType,
      aggregate_id: row.aggregate_id,
      event_type: row.event_type,
      event_data: JSON.parse(row.event_data),
      version: row.version,
      timestamp: row.timestamp
    } as DomainEvent;
  }
}

export const eventStore = new EventStore();
