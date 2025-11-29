import { Hono } from 'hono';
import type { Env } from '../types/env';

// Vérification de l'état du service 
const healthRouter = new Hono<{ Bindings: Env }>();


 //GET /health
// Vérifie  que l'API est opérationnelle.

healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: c.env.ENVIRONMENT,
    version: '1.0.0',
  });
});


 //GET /health/db
 //Vérifie si la base de données  est connectée et répond .
healthRouter.get('/db', async (c) => {
  try {
    const { createSupabaseClient } = await import('../services/supabase');
    const supabase = createSupabaseClient(c.env);

    // Requête test :  lecture dans la table "profiles"
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);

    // Si la base retourn  erreur 
    if (error) {
      return c.json(
        {
          status: 'error',
          database: 'échec de connexion',
          error: `Erreur lors de la requête vers la base de données : ${error.message}`,
        },
        503
      );
    }

    // Si tout est bon
    return c.json({
      status: 'ok',
      database: 'connectée',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    // Erreur générale
    return c.json(
      {
        status: 'error',
        database: 'échec de connexion',
        error: `Erreur interne lors de la vérification de la base : ${error.message}`,
      },
      503
    );
  }
});

export default healthRouter;
