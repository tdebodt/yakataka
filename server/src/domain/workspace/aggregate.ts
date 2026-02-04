import { eventStore } from '../../infrastructure/eventStore.js';
import type { Workspace, WorkspaceEvent, WorkspaceCreatedEvent } from '../../types.js';

export class WorkspaceAggregate {
  private state: Workspace | null = null;
  private version = 0;

  constructor(private readonly workspaceId: string) {}

  load(): this {
    const events = eventStore.getEvents('workspace', this.workspaceId);
    for (const event of events) {
      this.apply(event as WorkspaceEvent, false);
    }
    return this;
  }

  private apply(event: WorkspaceEvent, isNew: boolean): void {
    switch (event.event_type) {
      case 'WorkspaceCreated':
        this.state = {
          id: event.event_data.workspace_id,
          created_at: event.timestamp
        };
        break;
    }

    if (isNew) {
      eventStore.append(event);
    }
    this.version = event.version;
  }

  create(): Workspace {
    if (this.state) {
      return this.state;
    }

    const event: Omit<WorkspaceCreatedEvent, 'id' | 'timestamp'> = {
      aggregate_type: 'workspace',
      aggregate_id: this.workspaceId,
      event_type: 'WorkspaceCreated',
      event_data: { workspace_id: this.workspaceId },
      version: this.version + 1
    };

    this.apply({ ...event, timestamp: new Date().toISOString() } as WorkspaceCreatedEvent, true);
    return this.state!;
  }

  getState(): Workspace | null {
    return this.state;
  }

  exists(): boolean {
    return this.state !== null;
  }
}

export function getOrCreateWorkspace(workspaceId: string): Workspace {
  const aggregate = new WorkspaceAggregate(workspaceId).load();
  if (!aggregate.exists()) {
    return aggregate.create();
  }
  return aggregate.getState()!;
}

export function workspaceExists(workspaceId: string): boolean {
  const aggregate = new WorkspaceAggregate(workspaceId).load();
  return aggregate.exists();
}
