import { Hono } from 'hono';
import { z } from 'zod';
import { createSupabaseClient } from '../services/supabasa';
import type { Env, Variables} from '../types/env';

const authRouter = new Hono<{ Bindings: Env, Variables: Variables }>();

// Validation de schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  full_name: z.string().min(2),
  phone: z.string().min(10),
  country_code: z.string().default('+213'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register
authRouter.post('/register', async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    const supabase = createSupabaseClient(c.env);

    // L'inscription de l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone: data.phone,
          country_code: data.country_code,
        },
      },
    });

    if (authError) {
      return c.json({ error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: "Erreur de creation d'utilisateur" }, 500);
    }

    // Crée le profiles dans la table 'profiles'
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      full_name: data.full_name,
      phone: data.phone,
      country_code: data.country_code,
      role: 'user',
    });

    if (profileError) {
      console.error('Erreur de création de profile:', profileError);
      // Continuez ne bloque pas, le profil sera créé via le trigger
    }

    return c.json({
      message: "Inscrer avec succés. SVP vérifier votre email. ",
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
    }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Entrée invalide", details: error.errors }, 400);
    }
    console.error("Erreur d'enregistrement:", error);
    return c.json({ error: 'Erreur interne du serveur' }, 500);
  }
});

// POST /auth/login
authRouter.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const supabase = createSupabaseClient(c.env);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    });

    if (error) {
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // Get profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    return c.json({
      message: 'Connexion réussie',
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Entrée invalide', details: error.errors }, 400);
    }
    console.error('Erreur de connexion:', error);
    return c.json({ error: 'Erreur interne du serveur' }, 500);
  }
});

// GET /auth/me (protected)
authRouter.get('/me', async (c) => {
  const userId = c.get('userId');

  if (!userId) {
    return c.json({ error: 'Non autorisé' }, 401);
  }

  const supabase = createSupabaseClient(c.env);

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return c.json({ error: 'Profil introuvable' }, 404);
  }

  return c.json({ profile });
});

export default authRouter;