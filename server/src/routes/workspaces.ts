import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getOrCreateWorkspace } from '../domain/workspace/aggregate.js';
import { eventStore } from '../infrastructure/eventStore.js';

const router = Router();

// Create new workspace
router.post('/', (req, res) => {
  const workspaceId = uuidv4();
  const workspace = getOrCreateWorkspace(workspaceId);
  res.status(201).json(workspace);
});

// Get workspace (creates if not exists)
router.get('/:uuid', (req, res) => {
  const workspace = getOrCreateWorkspace(req.params.uuid);
  res.json(workspace);
});

// Get workspace event history
router.get('/:uuid/events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const events = eventStore.getWorkspaceEvents(req.params.uuid, limit);
  res.json(events);
});

export default router;
