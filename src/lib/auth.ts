import { NextRequest } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export interface AuthUser {
  id: string;
  email: string | null;
  staff: {
    id: string;
    role: string;
  } | null;
  token: string;
}

export async function getAuthUser(
  request: NextRequest
): Promise<AuthUser | null> {
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = createSupabaseAdmin();

  const { data: dataUser, error } = await supabase.auth.getUser(token);
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
    token,
  };
}

export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) {
    throw new Error("Authentication required");
  }
  return user;
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireAuth(request);
  const supabase = createSupabaseAdmin();

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
