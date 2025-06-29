import Fastify from "fastify";
import dotenv from "dotenv";
import fastifyCookie from "@fastify/cookie";
import fastifySession from "@fastify/session";
import fastifyOauth2 from "@fastify/oauth2";
import { google } from "googleapis";

import indexRoutes from "./routes/index";
import driveRoutes from "./routes/drive";

dotenv.config();

const app = Fastify({ logger: true });

// register cookie
app.register(fastifyCookie);

// register session
app.register(fastifySession, {
  secret: process.env.SESSION_SECRET || "supersecret", // fallback for dev
  cookie: { secure: false },
});

// register OAuth2
app.register(fastifyOauth2, {
  name: "googleOAuth2",
  scope: ["https://www.googleapis.com/auth/drive.readonly"],
  credentials: {
    client: {
      id: process.env.GOOGLE_CLIENT_ID || "",
      secret: process.env.GOOGLE_CLIENT_SECRET || "",
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
app.register(indexRoutes);
app.register(driveRoutes);

// start the server
const start = async () => {
  try {
    await app.listen({ port: 3000 });
    app.log.info(`▶️  Server listening on http://localhost:3000`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
