import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);
    const offset = (page - 1) * limit;

    let query = supabase
      .from("kids")
      .select("uuid, folder_id", { count: "exact" });

    // Add search functionality if search term is provided
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Check if it's a valid UUID format for exact match
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(searchTerm)) {
        query = query.eq("uuid", searchTerm);
      } else {
        // For partial searches, get all kids and filter in JavaScript
        const { data: allKids, error: searchError } = await supabase
          .from("kids")
          .select("uuid, folder_id")
          .limit(1000);

        if (searchError) throw searchError;

        const filteredKids =
          allKids?.filter(kid =>
            kid.uuid.toLowerCase().includes(searchTerm.toLowerCase())
          ) || [];

        if (filteredKids.length === 0) {
          return NextResponse.json({
            kids: [],
            pagination: {
              page,
              limit,
              total: 0,
              totalPages: 0,
              hasMore: false,
            },
          });
        }

        const matchingUuids = filteredKids.map(kid => kid.uuid);
        query = query.in("uuid", matchingUuids);
      }
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data: kids, error, count } = await query;

    if (error) {
      console.error("Error fetching kids:", error);
      return NextResponse.json(
        {
          error: "Failed to fetch students",
          details: error.message,
          code: error.code,
        },
        { status: 500 }
      );
    }

    const totalPages = Math.ceil((count || 0) / limit);
    const hasMore = page < totalPages;

    return NextResponse.json({
      kids: kids || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages,
        hasMore,
      },
    });
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

    console.error("Error in kids API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
