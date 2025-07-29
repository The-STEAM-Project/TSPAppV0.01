import { createSupabaseServer } from "@/lib/supabase/server";
import { LoginButton } from "@/components/login-button";
import { ProfileDropdown } from "@/components/profile-dropdown";

export async function AuthButton() {
  const supabase = await createSupabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? <ProfileDropdown user={user} /> : <LoginButton />;
}
