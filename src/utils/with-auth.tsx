import { createSupabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import React from "react";

export function withAuth<T extends object>(Component: React.ComponentType<T>) {
  return async function WithAuth(props: T) {
    const supabase = await createSupabaseServer();
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      redirect("/");
    }

    return <Component {...props} />;
  };
}
