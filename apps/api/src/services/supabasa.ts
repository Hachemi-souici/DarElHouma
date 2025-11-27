import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Env } from '../types/env';

export function createSupabaseClient(env: Env): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });
}

export function createSupabaseServiceRoleClient(env: Env): SupabaseClient {
    return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
        },
    });

}

export async function verifyToken(
    client: SupabaseClient,
    token: string
): Promise<{ user: any; error: any }> {
    const { data, error } = await client.auth.getUser(token);
    return { user: data.user, error };
}
