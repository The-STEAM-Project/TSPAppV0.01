import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";
import { LoginButton } from "./login-button";

export async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4">
      Hey, {user.user_metadata.full_name}!
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <LoginButton />
    </div>
  );
}
