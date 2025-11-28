export interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;

  R2_PUBLIC_URL: string;
  MEDIA_BUCKET: R2Bucket;

  FRONTEND_URL: string;
  JWT_SECRET: string;
  ALLOWED_ORIGINS: string;
  ENVIRONMENT: string;

  [key: string]: unknown;
}

export interface Variables extends Record<string, any> {
  token?: string;
  userId?: string;
  user?: any;
}
