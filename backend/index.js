import Fastify from "fastify";
import rootRoute from "./routes/root.js";

const fastify = Fastify({ logger: true });

// Register routes defined in routes/root.js
fastify.register(rootRoute);

// Run the server!
const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
    console.log(`Server listening on port 3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
