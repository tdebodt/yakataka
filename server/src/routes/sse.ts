import { Router } from 'express';
import { eventBroadcaster } from '../infrastructure/eventBroadcaster.js';

const router = Router();

// SSE endpoint for project events
router.get('/projects/:projectId/events/stream', (req, res) => {
  const { projectId } = req.params;
  const clientId = `${projectId}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders();

  // Send initial connection event
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ clientId, projectId })}\n\n`);

  // Register client with broadcaster
  eventBroadcaster.addClient(clientId, projectId, res);

  // Send heartbeat every 30 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`:heartbeat\n\n`);
    } catch {
      clearInterval(heartbeatInterval);
    }
  }, 30000);

  // Clean up on connection close
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    eventBroadcaster.removeClient(clientId);
  });
});

export default router;
