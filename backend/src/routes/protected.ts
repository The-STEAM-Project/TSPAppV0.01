import { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { JsonSchemaToTsProvider } from "@fastify/type-provider-json-schema-to-ts";

function ensureLoggedIn(
  req: FastifyRequest,
  reply: FastifyReply,
  done: () => void
) {
  if (!req.user) return reply.code(401).send({ error: "Auth required" });
  done();
}

const protectedRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preValidation", ensureLoggedIn);

  app.get("/profile", async (req, reply) => {
    const { data: staff, error } = await app.supabase
      .from("staff")
      .select("*")
      .eq("id", req.user!.id)
      .single();

    if (error) return reply.code(400).send({ error: error.message });
    reply.send(staff);
  });

  app.withTypeProvider<JsonSchemaToTsProvider>().post(
    "/media",
    {
      schema: {
        body: {
          type: "object",
          required: ["kidUuid", "fileName"],
          properties: {
            kidUuid: { type: "string", format: "uuid" },
            fileName: { type: "string", minLength: 1 },
          },
        },
      },
    },
    async (req, reply) => {
      const { kidUuid, fileName } = req.body;
      const uploaderId = req.user!.id;

      const { data: kid, error: errorKid } = await app.supabase
        .from("kids")
        .select("id")
        .eq("uuid", kidUuid)
        .single();
      if (errorKid) {
        req.log.error(errorKid);
        return reply.code(404).send("kid not found");
      }

      const { data, error } = await app.supabase
        .from("media")
        .insert([
          {
            kid_id: kid.id,
            file_name: fileName,
            uploaded_by: uploaderId,
          },
        ])
        .select("id");
      if (error) {
        req.log.error(error);
        return reply.code(400).send({ error: error.message });
      }

      reply.code(201).send({ id: data[0].id });
    }
  );
};

export default protectedRoutes;
