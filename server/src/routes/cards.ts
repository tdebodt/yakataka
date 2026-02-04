import { Router } from 'express';
import { loadProject, getProjectsByWorkspace } from '../domain/project/aggregate.js';
import { eventStore } from '../infrastructure/eventStore.js';

const router = Router();

// Helper to find project containing a card
function findProjectForCard(cardId: string, workspaceId?: string): { aggregate: ReturnType<typeof loadProject>; card: NonNullable<ReturnType<ReturnType<typeof loadProject>['getCard']>> } | null {
  // If workspaceId provided, search in that workspace's projects
  if (workspaceId) {
    const projects = getProjectsByWorkspace(workspaceId);
    for (const project of projects) {
      const aggregate = loadProject(project.id);
      const card = aggregate.getCard(cardId);
      if (card) {
        return { aggregate, card };
      }
    }
  }
  return null;
}

// Create card in column
router.post('/columns/:columnId/cards', (req, res) => {
  const { title, description, position, project_id } = req.body;
  const source = (req as any).source;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const column = aggregate.getColumn(req.params.columnId);
  if (!column) {
    return res.status(404).json({ error: 'Column not found' });
  }
  const card = aggregate.addCard(req.params.columnId, title, description || '', position, source);
  res.status(201).json(card);
});

// Update card
router.put('/cards/:id', (req, res) => {
  const { title, description, column_id, position, project_id } = req.body;
  const source = (req as any).source;
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const card = aggregate.getCard(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  // Update title/description if provided
  if (title !== undefined || description !== undefined) {
    aggregate.updateCard(req.params.id, {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description })
    }, source);
  }

  // Move card if column_id or position provided
  if (column_id !== undefined || position !== undefined) {
    aggregate.moveCard(
      req.params.id,
      column_id ?? card.column_id,
      position,
      source
    );
  }

  res.json(aggregate.getCard(req.params.id));
});

// Delete card
router.delete('/cards/:id', (req, res) => {
  const { project_id } = req.body;
  const source = (req as any).source;
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const card = aggregate.getCard(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  aggregate.deleteCard(req.params.id, source);
  res.status(204).send();
});

// Get card event history
router.get('/cards/:id/events', (req, res) => {
  const { project_id, limit } = req.query;
  if (!project_id || typeof project_id !== 'string') {
    return res.status(400).json({ error: 'project_id query parameter is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const card = aggregate.getCard(req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const limitNum = limit ? parseInt(limit as string, 10) : undefined;
  const events = eventStore.getCardEvents(project_id, req.params.id, limitNum);
  res.json(events);
});

export default router;
