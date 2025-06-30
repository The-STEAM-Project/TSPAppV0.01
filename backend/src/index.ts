import fastifyCookie from "@fastify/cookie";
import fastifyEnv from "@fastify/env";
import fastifyOauth2 from "@fastify/oauth2";
import fastifySession from "@fastify/session";
import Fastify from "fastify";

import authPlugin from "./plugins/auth";
import supabasePlugin from "./plugins/supabase";

import driveRoutes from "./routes/drive";
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
      ],
      properties: {
        SESSION_SECRET: { type: "string" },
        GOOGLE_CLIENT_ID: { type: "string" },
        GOOGLE_CLIENT_SECRET: { type: "string" },
        SUPABASE_URL: { type: "string" },
        SUPABASE_SECRET_KEY: { type: "string" },
      },
    },
    dotenv: true,
  });

  await app.register(supabasePlugin);
  await app.register(authPlugin);

  // register cookie
  app.register(fastifyCookie);

  // register session
  app.register(fastifySession, {
    secret: app.config.SESSION_SECRET,
    cookie: { secure: false },
  });

  // register OAuth2
  app.register(fastifyOauth2, {
    name: "googleOAuth2",
    scope: ["https://www.googleapis.com/auth/drive.readonly"],
    credentials: {
      client: {
        id: app.config.GOOGLE_CLIENT_ID,
        secret: app.config.GOOGLE_CLIENT_SECRET,
      },
      auth: fastifyOauth2.GOOGLE_CONFIGURATION,
    },
    startRedirectPath: "/login/google",
    callbackUri: "http://localhost:3000/login/google/callback",
  });

  // OAuth2 callback route
  app.get("/login/google/callback", async (request, reply) => {
    const { token } =
      await app.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
    // @ts-ignore: attach token to session (session is dynamically typed)
    request.session.googleToken = token;
    reply.send({ ok: true, token });
  });

  // register your other routes
  app.register(driveRoutes);
  app.register(publicRoutes, { prefix: "/public/api" });
  app.register(protectedRoutes, { prefix: "/api" });

  return app;
};

// start the server
const start = async () => {
  const app = await createApp();
  try {
    await app.listen({ port: 3000 });
    app.log.info(`Server listening on http://localhost:3000`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
