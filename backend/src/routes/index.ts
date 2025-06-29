import { FastifyPluginAsync } from "fastify";

const indexRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    return { message: "Home Page" };
  });
};

export default indexRoutes;
