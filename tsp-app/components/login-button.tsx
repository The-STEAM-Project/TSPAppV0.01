"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { defaultUrl } from "@/lib/utils";

export function LoginButton() {
  const login = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${defaultUrl}/auth/callback?next=/protected`,
      },
    });
  };

  return <Button onClick={login}>Login</Button>;
}
