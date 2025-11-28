import type { Context, Next } from 'hono';
import type { Env, Variables } from '../types/env';
import { createSupabaseClient } from '../services/supabase';

export async function authMiddleware(
  c: Context<{ Bindings: Env; Variables: Variables }>,
  next: Next
) {
  const authHeader =
    c.req.header('authorization') ?? c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: "Token manquant ou invalide" }, 401);
  }

  const token = authHeader.split(' ')[1];

  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user) {
    return c.json({ error: "Token invalide ou expiré" }, 401);
  }

  const user = data.user; // <-- ici TS sait que c'est un User

  c.set('token', token);
  c.set('userId', user.id);
  c.set('user', user);

  await next();
}
