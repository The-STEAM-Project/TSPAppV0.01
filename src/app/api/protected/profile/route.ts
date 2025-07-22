import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await requireAdmin();
    const supabase = await createSupabaseServer();

    const { data: staff, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(staff);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Authentication required") {
        return NextResponse.json({ error: "Auth required" }, { status: 401 });
      }
      if (error.message === "Admin access required") {
        return NextResponse.json(
          { error: "Email not allowed" },
          { status: 403 }
        );
      }
    }

    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
