import { Router } from 'express';
import { loadProject } from '../domain/project/aggregate.js';

const router = Router();

// Get cards this card depends on
router.get('/cards/:id/dependencies', (req, res) => {
  const { project_id } = req.query;
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

  // Get the actual card objects for dependencies
  const dependencies = card.dependencies
    .map(depId => aggregate.getCard(depId))
    .filter((c): c is NonNullable<typeof c> => c !== undefined);

  res.json(dependencies);
});

// Get cards that depend on this card
router.get('/cards/:id/dependents', (req, res) => {
  const { project_id } = req.query;
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

  // Find all cards that have this card in their dependencies
  const project = aggregate.toProject();
  const dependents = project.columns
    .flatMap(col => col.cards)
    .filter(c => c.dependencies.includes(req.params.id));

  res.json(dependents);
});

// Add dependency
router.post('/cards/:id/dependencies', (req, res) => {
  const { depends_on_card_id, project_id } = req.body;
  const source = (req as any).source;
  if (!depends_on_card_id) {
    return res.status(400).json({ error: 'depends_on_card_id is required' });
  }
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
  const dependsOnCard = aggregate.getCard(depends_on_card_id);
  if (!dependsOnCard) {
    return res.status(404).json({ error: 'Dependency card not found' });
  }

  try {
    aggregate.addDependency(req.params.id, depends_on_card_id, source);
    res.status(201).json(aggregate.getCard(req.params.id));
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

// Remove dependency
router.delete('/cards/:id/dependencies/:dependsOnId', (req, res) => {
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

  aggregate.removeDependency(req.params.id, req.params.dependsOnId, source);
  res.status(204).send();
});

export default router;
