export interface Env {
    // Supabase
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;

    // R2 Storage
    R2_PUBLIC_URL: string;
    MEDIA_BUCKET: R2Bucket;

    // App Config
    FRONTEND_URL: string;
    JWT_SECRET: string;
    ALLOWED_ORIGINS: string;
    ENVIRONMENT: string;
    // Obligatoire pour Cloudflare Workers :
    [key: string]: unknown;
}

export type Variables ={
    userId: string | null;
    user: User | null;
}