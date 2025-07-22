import { createSupabaseServer } from "@/lib/supabase/server";

export interface AuthUser {
  id: string;
  email: string | null;
  staff: {
    id: string;
    role: string;
  } | null;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  const supabase = await createSupabaseServer();

  const { data: dataUser, error } = await supabase.auth.getUser();
  if (error) {
    throw new Error("Invalid or expired JWT");
  }

  const { data: staff } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", dataUser.user.id)
    .single();

  return {
    id: dataUser.user.id,
    email: dataUser.user.email ?? null,
    staff,
  };
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  const user = await requireAuth();
  const supabase = await createSupabaseServer();

  const { data: admin, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", user.email)
    .single();

  if (error || !admin) {
    throw new Error("Admin access required");
  }

  return user;
}
