import fp from "fastify-plugin";
import { createClient } from "@supabase/supabase-js";

export default fp(app => {
  const supabase = createClient(
    app.config.SUPABASE_URL,
    app.config.SUPABASE_SECRET_KEY,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  app.decorate("supabase", supabase);
});
