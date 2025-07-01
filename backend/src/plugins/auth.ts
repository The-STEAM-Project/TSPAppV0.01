import fp from "fastify-plugin";

export default fp(
  async (app) => {
    app.addHook("onRequest", async (req, reply) => {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        // No token → unauthenticated request; leave req.user undefined
        return;
      }

      const token = authHeader.slice(7); // strip "Bearer "
      const { data: dataUser, error } = await app.supabase.auth.getUser(token);
      if (error) {
        return reply.code(401).send({ error: "Invalid or expired JWT" });
      }

      const { data: staff } = await app.supabase
        .from("public.users")
        .select("id, role")
        .eq("id", dataUser.user.id)
        .single();

      req.user = {
        id: dataUser.user.id,
        email: dataUser.user.email ?? null,
        staff, // may be null if trigger hasn’t run
        token,
      };
    });
  },
  { name: "auth" }
);
