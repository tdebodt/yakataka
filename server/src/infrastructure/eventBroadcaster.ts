import type { Response } from 'express';
import type { DomainEvent } from '../types.js';

interface SSEClient {
  id: string;
  projectId: string;
  res: Response;
}

class EventBroadcaster {
  private clients: Map<string, SSEClient> = new Map();

  addClient(clientId: string, projectId: string, res: Response): void {
    this.clients.set(clientId, { id: clientId, projectId, res });

    // Clean up on connection close
    res.on('close', () => {
      this.clients.delete(clientId);
    });
  }

  removeClient(clientId: string): void {
    this.clients.delete(clientId);
  }

  broadcast(projectId: string, event: DomainEvent): void {
    const eventData = JSON.stringify({
      type: event.event_type,
      data: event.event_data,
      timestamp: event.timestamp,
      version: event.version,
    });

    for (const client of this.clients.values()) {
      if (client.projectId === projectId) {
        try {
          client.res.write(`event: ${event.event_type}\n`);
          client.res.write(`data: ${eventData}\n\n`);
        } catch {
          // Client disconnected, remove it
          this.clients.delete(client.id);
        }
      }
    }
  }

  getClientCount(projectId?: string): number {
    if (!projectId) {
      return this.clients.size;
    }
    return Array.from(this.clients.values()).filter(c => c.projectId === projectId).length;
  }
}

export const eventBroadcaster = new EventBroadcaster();
