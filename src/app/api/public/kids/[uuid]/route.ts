import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const supabase = createSupabaseAdmin();
    const { uuid } = await params;

    const { data: kid, error } = await supabase
      .from("kids")
      .select("folder_id, uuid")
      .eq("uuid", uuid)
      .single();

    if (error) {
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    return NextResponse.json(kid);
  } catch (error) {
    console.error("Error fetching kid:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
