import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getSessionOrRedirect() {
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase.auth.getUser();
  const { data: session, error: sessionError } =
    await supabase.auth.getSession();

  if (userError || sessionError || !user.user || !session.session) {
    redirect("/");
  } else {
    return session;
  }
}
