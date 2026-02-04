import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

import workspacesRouter from './routes/workspaces.js';
import projectsRouter from './routes/projects.js';
import columnsRouter from './routes/columns.js';
import cardsRouter from './routes/cards.js';
import dependenciesRouter from './routes/dependencies.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/workspaces', workspacesRouter);
app.use('/api', projectsRouter);
app.use('/api', columnsRouter);
app.use('/api', cardsRouter);
app.use('/api', dependenciesRouter);

// Serve static files from client build in production
const clientDistPath = path.join(__dirname, '..', '..', 'client', 'dist');
app.use(express.static(clientDistPath));

// SPA fallback - serve index.html for any non-API routes
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

app.listen(PORT, () => {
  console.log(`TakaYaka server running at http://localhost:${PORT}`);
});
