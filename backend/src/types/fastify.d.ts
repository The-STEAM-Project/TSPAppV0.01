import "fastify";
import { OAuth2Namespace } from "@fastify/oauth2";
import { SupabaseClient } from "@supabase/supabase-js";
import { google } from "googleapis";

declare module "fastify" {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
    supabase: SupabaseClient;
    drive: google.VERSIONS["v3"];
    config: {
      SESSION_SECRET: string;
      GOOGLE_CLIENT_ID: string;
      GOOGLE_CLIENT_SECRET: string;
      SUPABASE_URL: string;
      SUPABASE_SECRET_KEY: string;
      SERVICE_ACCOUNT_LOCATION: string;
    };
  }
  interface FastifyRequest {
    user?: {
      id: string;
      email: string | null;
      staff: {
        id: string;
        role: string | null;
      } | null;
      token: string;
    };
  }
}
