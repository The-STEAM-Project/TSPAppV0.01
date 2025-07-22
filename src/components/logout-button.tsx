"use client";

import { createSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
    router.push("/");
    window.location.reload();
  };

  return <Button onClick={logout}>Logout</Button>;
}
