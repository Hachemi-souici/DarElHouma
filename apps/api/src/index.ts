import { Hono } from 'hono';
import { coresMiddleware } from './middlewares/cors';
import { authMiddleware } from './middlewares/auth';
import authRouter from './routes/auth';
import healthRouter from './routes/health';
import type { Env } from './types/env';

const app = new Hono<{ Bindings: Env }>();

// Active le cors sur. tous les routes
app.use('*', coresMiddleware());

// Routes de health check
app.route('/health', healthRouter);

// routes d'authentification
app.route('/auth', authRouter);

// Routes protégées par authentification
app.use('/api/*', authMiddleware());

// route racine
app.get('/', (c) => {
  return c.json({
    name: 'Dar el Houma',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    endpoints: {
      health: '/health',
      auth: '/auth',
      docs: '/docs',
    },
  });
});

// Route introuvable 404
app.notFound((c) => {
  return c.json({ error: 'Route introuvable' }, 404);
});

// Capte toutes les erreurs non interceptées 500
app.onError((err, c) => {
  console.error('Erreur non interceptée:', err);
  return c.json({
    error: 'Erreur interne du serveur',
    message: err.message,
  }, 500);
});

export default app;