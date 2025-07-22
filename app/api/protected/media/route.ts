import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin(request);
    const supabase = createServerSupabaseClient();

    const body = await request.json();
    const { kidUuid, fileName } = body;

    if (!kidUuid || !fileName) {
      return NextResponse.json(
        { error: "kidUuid and fileName are required" },
        { status: 400 }
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(kidUuid)) {
      return NextResponse.json(
        { error: "Invalid UUID format" },
        { status: 400 }
      );
    }

    const { data: kid, error: errorKid } = await supabase
      .from("kids")
      .select("id")
      .eq("uuid", kidUuid)
      .single();

    if (errorKid) {
      console.error("Kid lookup error:", errorKid);
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("media")
      .insert([
        {
          kid_id: kid.id,
          file_name: fileName,
          uploaded_by: user.id,
        },
      ])
      .select("id");

    if (error) {
      console.error("Media insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ id: data[0].id }, { status: 201 });
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

    console.error("Error in media API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
