import { Context, Next } from 'hono';
import { createSupabaseClient, verifyToken } from '../services/supabasa';
import type { Env, Variables} from '../types/env';

export function authMiddleware() {
  return async (c: Context<{ Bindings: Env, Variables: Variables}>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
      return c.json({ error: "En-tête d'autorisation manquant ou invalide "}, 401);
    }

    const token = authHeader.split(' ')[1];
    const supabase = createSupabaseClient(c.env);

    const { user, error } = await verifyToken(supabase, token);

    if (error || !user) {
      return c.json({ error: 'Token invalide ou expiré' }, 401);
    }

    // Attacher l'utilisateur au contexte
    c.set('user', user);
    c.set('userId', user.id);

    await next();
  };
}

export function optionalAuthMiddleware() {
  return async (c: Context<{ Bindings: Env, Variables: Variables }>, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const supabase = createSupabaseClient(c.env);
      const { user } = await verifyToken(supabase, token);

      if (user) {
        c.set('user', user);
        c.set('userId', user.id);
      }
    }

    await next();
  };
}