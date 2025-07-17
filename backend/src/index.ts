import fastifyCookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyEnv from "@fastify/env";
import fastifyMultipart from "@fastify/multipart";
import fastifySession from "@fastify/session";
import Fastify from "fastify";

import authPlugin from "./plugins/auth";
import drivePlugin from "./plugins/drive";
import supabasePlugin from "./plugins/supabase";

import protectedRoutes from "./routes/protected";
import publicRoutes from "./routes/public";

const createApp = async () => {
  const app = Fastify({ logger: true });

  await app.register(fastifyEnv, {
    schema: {
      type: "object",
      required: [
        "SESSION_SECRET",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "SUPABASE_URL",
        "SUPABASE_SECRET_KEY",
        "SERVICE_ACCOUNT_LOCATION",
      ],
      properties: {
        SESSION_SECRET: { type: "string" },
        GOOGLE_CLIENT_ID: { type: "string" },
        GOOGLE_CLIENT_SECRET: { type: "string" },
        SUPABASE_URL: { type: "string" },
        SUPABASE_SECRET_KEY: { type: "string" },
        SERVICE_ACCOUNT_LOCATION: { type: "string" },
      },
    },
    dotenv: true,
  });

  await app.register(cors, {
    origin: "http://localhost:3000", // Adjust this to your frontend URL
    preflight: true,
    preflightContinue: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie"],
  });

  await app.register(fastifyCookie);
  await app.register(fastifyMultipart);
  await app.register(supabasePlugin);
  await app.register(authPlugin);
  await app.register(drivePlugin);

  await app.register(fastifySession, {
    secret: app.config.SESSION_SECRET,
    cookie: { secure: false, sameSite: "lax" }, // Set secure to true in production
  });

  await app.register(publicRoutes, { prefix: "/public/api" });
  await app.register(protectedRoutes, { prefix: "/protected/api" });

  return app;
};

const start = async () => {
  const app = await createApp();
  try {
    await app.listen({ port: 3001 });
    app.log.info(`Server listening on http://localhost:3001`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
