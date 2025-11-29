// apps/api/src/index.ts
import { Hono } from 'hono'
import { logger } from 'hono/logger'

// Middlewares persos
import { coresMiddleware } from './middlewares/cors'
import { authMiddleware } from './middlewares/auth'

// Routes
import authRouter from './routes/auth'
import healthRouter from './routes/health'

import type { AppBindings } from './types/env'


const app = new Hono<AppBindings>()

// ============================================
// MIDDLEWARES GLOBAUX
// ============================================

// CORS (personnalisé)
app.use('/*', coresMiddleware())

// Logger global
app.use('/*', logger())

// ============================================
// ROUTES PUBLIQUES
// ============================================

// Health check
app.route('/health', healthRouter)

// Auth
app.route('/auth', authRouter)

// ============================================
// ROUTES PROTÉGÉES
// ============================================

app.use('/api/*', authMiddleware)

// Exemple d'endpoint protégé
app.get('/api/profile', (c) => {
  return c.json({
    message: 'Accès autorisé',
    user: c.get('user')
  })
})

// ============================================
// ROUTE RACINE
// ============================================

app.get('/', (c) => {
  return c.json({
    name: 'Dar El Houma API',
    version: '1.0.0',
    environment: c.env.ENVIRONMENT,
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/auth',
      apiProtected: '/api/*',
      docs: '/docs'
    }
  })
})

// ============================================
// GESTION DES ERREURS
// ============================================

// 404
app.notFound((c) => {
  return c.json(
    {
      error: 'Route introuvable',
      path: c.req.path
    },
    404
  )
})

// 500
app.onError((err, c) => {
  console.error('Erreur non interceptée:', err)
  return c.json(
    {
      error: 'Erreur interne du serveur',
      message: err.message
    },
    500
  )
})

export default app
