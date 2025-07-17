import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/")) {
    // if "next" is not a relative URL, use the default
    next = "/";
  }

  const supabase = await createClient();
  if (code) {
    const {
      error,
      data: { user },
    } = await supabase.auth.exchangeCodeForSession(code);

    // check if email is in admins list of emails
    const { error: adminError, data: admin } = await supabase
      .from("admins")
      .select("*")
      .eq("email", user?.email)
      .single();

    if (!error && !adminError && admin) {
      const forwardedHost = request.headers.get("x-forwarded-host"); // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  await supabase.auth.signOut();

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/auth/error?error=Account not allowed to access admin features`
  );
}
