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

  app.post("/set-auth-cookie", async (req, res) => {
    const { access_token, refresh_token } = req.body;
    if (!access_token || !refresh_token) return res.status(400).send();

    res
      .setCookie("sb-access-token", access_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: "lax",
      })
      .setCookie("sb-refresh-token", refresh_token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production" ? true : false,
        sameSite: "lax",
      });

    res.status(200).send({ ok: true });
  });
};

export default publicRoutes;
