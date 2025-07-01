import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { defaultUrl } from "@/lib/utils";

export async function GET() {
  const supabase = await createClient();
  const { data } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${defaultUrl}/auth/callback?next=/protected`,
    },
  });

  if (data.url) {
    return NextResponse.redirect(data.url);
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${defaultUrl}/auth/error?error=Account not allowed to access admin features`
  );
}
