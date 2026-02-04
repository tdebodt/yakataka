import { Router } from 'express';
import { loadProject } from '../domain/project/aggregate.js';

const router = Router();

// Create column in project
router.post('/projects/:projectId/columns', (req, res) => {
  const { name, position } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const aggregate = loadProject(req.params.projectId);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const column = aggregate.addColumn(name, position);
  res.status(201).json(column);
});

// Update column (name or position)
router.put('/columns/:id', (req, res) => {
  const { name, position, project_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const column = aggregate.getColumn(req.params.id);
  if (!column) {
    return res.status(404).json({ error: 'Column not found' });
  }
  if (name !== undefined) {
    aggregate.renameColumn(req.params.id, name);
  }
  if (position !== undefined) {
    aggregate.moveColumn(req.params.id, position);
  }
  res.json(aggregate.getColumn(req.params.id));
});

// Delete column
router.delete('/columns/:id', (req, res) => {
  const { project_id } = req.body;
  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' });
  }
  const aggregate = loadProject(project_id);
  if (!aggregate.exists()) {
    return res.status(404).json({ error: 'Project not found' });
  }
  const column = aggregate.getColumn(req.params.id);
  if (!column) {
    return res.status(404).json({ error: 'Column not found' });
  }
  aggregate.deleteColumn(req.params.id);
  res.status(204).send();
});

export default router;
