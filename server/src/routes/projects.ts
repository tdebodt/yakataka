import { Router } from 'express';
import { getOrCreateWorkspace } from '../domain/workspace/aggregate.js';
import { createProject, getProjectsByWorkspace, loadProject } from '../domain/project/aggregate.js';
import { eventStore } from '../infrastructure/eventStore.js';

const router = Router();

// List projects in workspace
router.get('/workspaces/:uuid/projects', (req, res) => {
  // Ensure workspace exists
  getOrCreateWorkspace(req.params.uuid);
  const projects = getProjectsByWorkspace(req.params.uuid);
  res.json(projects);
});

// Create project in workspace
router.post('/workspaces/:uuid/projects', (req, res) => {
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  // Ensure workspace exists
  getOrCreateWorkspace(req.params.uuid);
  const project = createProject(req.params.uuid, name, description || '');
  res.status(201).json(project);
});

// Get project with all columns and cards
router.get('/projects/:id', (req, res) => {
  const aggregate = loadProject(req.params.id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  res.json(aggregate.toProject());
});

// Update project
router.put('/projects/:id', (req, res) => {
  const { name, description } = req.body;
  const aggregate = loadProject(req.params.id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  if (name !== undefined) {
    aggregate.rename(name);
  }
  if (description !== undefined) {
    aggregate.updateDescription(description);
  }
  res.json(aggregate.toProject());
});

// Delete project
router.delete('/projects/:id', (req, res) => {
  const aggregate = loadProject(req.params.id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  aggregate.delete();
  res.status(204).send();
});

// Get project event history
router.get('/projects/:id/events', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const events = eventStore.getEvents('project', req.params.id);
  const result = limit ? events.slice(-limit) : events;
  res.json(result);
});

export default router;
