import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";
import { FastifyPluginAsync } from "fastify";

const publicRoutes: FastifyPluginAsync = async (app) => {
  app.withTypeProvider<JsonSchemaToTsProvider>().get(
    "/kids/:uuid",
    {
      schema: {
        params: {
          type: "object",
          required: ["uuid"],
          properties: {
            uuid: { type: "string", format: "uuid" },
          },
        },
      },
    },
    async (req, reply) => {
      const { data: kid, error: error } = await app.supabase
        .from("kids")
        .select("folder_id, uuid")
        .eq("uuid", req.params.uuid)
        .single();
      if (error) return reply.code(404).send("kid not found");

      reply.send(kid);
    }
  );
};

export default publicRoutes;
