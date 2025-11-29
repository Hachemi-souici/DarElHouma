import {AppBindings} from "@/types/env";
import { Context, Next } from "hono";
import { boolean } from "zod/v4";



export function coresMiddleware() {
    return async (c: Context<AppBindings>, next: Next) => {
        const origin = c.req.header("Origin") || '';
        const allowedOrigins = (c.env.ALLOWED_ORIGINS ?? '*')
        .split(',')
        .map(o => o.trim())
        .filter(boolean);

        //Verifier si origin est autorisée
        const isAllowed = allowedOrigins.includes(origin) || c.env.ENVIRONMENT === 'development';

        if (isAllowed) {
            c.header("Access-Control-Allow-Origin", origin || '*');
        }
        c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        c.header("Access-Control-Allow-Headers",
            "Content-Type, Authorization, X-Requested-With,");
        
        // Gérer en amont les requêtes OPTIONS
        if (c.req.method === "OPTIONS") {
            return c.text("OK", 200);
        }

        await next();       

    }
}