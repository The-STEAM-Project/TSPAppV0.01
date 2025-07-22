import { ReactNode } from "react";
import { SessionProvider } from "@/contexts/session-context";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase/server";

interface AdminLayoutProps {
  children: ReactNode;
}

async function getSessionOrRedirect() {
  const supabase = await createSupabaseServer();

  const { data: user, error: userError } = await supabase.auth.getUser();
  const { data: session, error: sessionError } =
    await supabase.auth.getSession();

  if (userError || sessionError || !user.user || !session.session) {
    redirect("/");
  } else {
    return session;
  }
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const { session } = await getSessionOrRedirect();

  return <SessionProvider session={session}>{children}</SessionProvider>;
}
