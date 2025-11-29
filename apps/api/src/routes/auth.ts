import { Hono } from "hono";
import { z } from "zod";
import {
  createSupabaseClient,
  createUserSupabaseClient
} from "../services/supabase";
import type { AppBindings} from "../types/env";
import { authMiddleware } from "@/middlewares/auth";

const authRouter = new Hono<AppBindings>();

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe trop court"),
  full_name: z.string().min(2, "Nom complet requis"),
  phone: z.string().min(9, "Numéro invalide"),
  country_code: z.string().default("+213")
});

const loginSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(1, "Mot de passe requis")
});

// ============================================
// POST /auth/register
// ============================================

authRouter.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const data = registerSchema.parse(body);

    const supabase = createSupabaseClient(c.env);

    // ⭐ Créer l'utilisateur - Le trigger créera automatiquement le profil
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.full_name,
          phone: data.phone,
          country_code: data.country_code
        },
        emailRedirectTo: `${c.env.FRONTEND_URL}/auth/callback`
      }
    });

    if (authError) {
      console.error("❌ Erreur signUp:", authError);
      return c.json({ error: authError.message }, 400);
    }

    if (!authData.user) {
      return c.json({ error: "Échec de création d'utilisateur" }, 500);
    }

    console.log("✅ User créé:", authData.user.id);

    // ⭐ Attendre un peu que le trigger fasse son travail
    await new Promise(resolve => setTimeout(resolve, 500));

    // ⭐ Vérifier que le profil a été créé par le trigger
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, phone, country_code")
      .eq("id", authData.user.id)
      .single();

    if (profileError || !profile) {
      console.warn("⚠️ Profil non trouvé après trigger:", profileError?.message);
      // Ne pas échouer, le profil sera créé au premier login
    } else {
      console.log("✅ Profil créé par trigger:", profile);
    }

    return c.json({
      message: "Inscription réussie. Vérifiez votre email.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: data.full_name
      }
    }, 201);

  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Entrée invalide", details: error.errors }, 400);
    }

    console.error("❌ Erreur inscription:", error);
    return c.json({ error: "Erreur interne" }, 500);
  }
});

// ============================================
// POST /auth/login
// ============================================

authRouter.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const data = loginSchema.parse(body);

    const supabase = createSupabaseClient(c.env);

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    });

    if (error) {
      console.error("❌ Erreur login:", error);
      return c.json({ error: "Identifiants invalides" }, 401);
    }

    // Récupérer profil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (profileError) {
      console.error("⚠️ Erreur récupération profil:", profileError);
    }

    console.log("✅ Login réussi pour:", authData.user.email);

    return c.json({
      message: "Connexion réussie",
      session: authData.session,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        profile
      }
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: "Entrée invalide", details: error.errors }, 400);
    }

    console.error("❌ Erreur login:", error);
    return c.json({ error: "Erreur interne du serveur" }, 500);
  }
});

// ============================================
// GET /auth/me (PROTECTED)
// ============================================

authRouter.get("/me", authMiddleware, async (c) => {
  try {
    const userId = c.get("userId");
    const token = c.get("token");

    console.log("🔍 Recherche profil pour userId:", userId);

    if (!userId || !token) {
      return c.json({ error: "Non autorisé" }, 401);
    }

    const supabase = createUserSupabaseClient(c.env, token);

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("❌ Erreur récupération profil:", error);
      return c.json({ 
        error: "Profil introuvable",
        details: error.message 
      }, 404);
    }

    if (!profile) {
      console.error("❌ Profil null pour userId:", userId);
      return c.json({ error: "Profil introuvable" }, 404);
    }

    console.log("✅ Profil trouvé:", profile);

    return c.json({ profile });
  } catch (error) {
    console.error("❌ Erreur /me:", error);
    return c.json({ error: "Erreur interne du serveur" }, 500);
  }
});

// ============================================
// POST /auth/logout
// ============================================

authRouter.post("/logout", authMiddleware, async (c) => {
  try {
    const token = c.get("token");
    if (!token) return c.json({ error: "Non autorisé" }, 401);

    const supabase = createUserSupabaseClient(c.env, token);

    await supabase.auth.signOut();

    console.log("✅ Déconnexion réussie");

    return c.json({ message: "Déconnexion réussie" });
  } catch (error) {
    console.error("❌ Erreur logout:", error);
    return c.json({ error: "Erreur interne du serveur" }, 500);
  }
});

// ============================================
// POST /auth/refresh
// ============================================

authRouter.post("/refresh", async (c) => {
  try {
    const { refresh_token } = await c.req.json();
    if (!refresh_token) {
      return c.json({ error: "Refresh token manquant" }, 400);
    }

    const supabase = createSupabaseClient(c.env);

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      console.error("❌ Erreur refresh:", error);
      return c.json({ error: "Token invalide" }, 401);
    }

    console.log("✅ Token rafraîchi");

    return c.json({ session: data.session });
  } catch (error) {
    console.error("❌ Erreur refresh:", error);
    return c.json({ error: "Erreur interne du serveur" }, 500);
  }
});

export default authRouter;