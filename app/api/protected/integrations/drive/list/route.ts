import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getGoogleDrive } from "@/lib/google-drive";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);
    const supabase = createServerSupabaseClient();
    const drive = getGoogleDrive();

    const { searchParams } = new URL(request.url);
    const kidUuid = searchParams.get("kidUuid");
    const pageSize = Math.min(
      parseInt(searchParams.get("pageSize") || "10"),
      100
    );
    const pageToken = searchParams.get("pageToken");

    let query: {
      pageSize: number;
      fields: string;
      pageToken?: string;
      q?: string;
    } = {
      pageSize,
      fields:
        "nextPageToken, files(id, name, mimeType, createdTime, size, parents, thumbnailLink, webViewLink)",
    };

    if (pageToken) {
      query.pageToken = pageToken;
    }

    // If kidUuid is provided, filter by the kid's folder
    if (kidUuid) {
      // Validate UUID format
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(kidUuid)) {
        return NextResponse.json(
          { error: "Invalid UUID format" },
          { status: 400 }
        );
      }

      // Get the kid's folder_id from the database
      const { data: kid, error: kidError } = await supabase
        .from("kids")
        .select("folder_id")
        .eq("uuid", kidUuid)
        .single();

      if (kidError) {
        return NextResponse.json(
          { error: "Student not found" },
          { status: 404 }
        );
      }

      if (!kid.folder_id) {
        return NextResponse.json(
          { error: "Student folder not configured" },
          { status: 400 }
        );
      }

      // Validate that the folder exists and is accessible
      try {
        const folderCheck = await drive.files.get({
          fileId: kid.folder_id,
          fields: "id, name, mimeType",
        });

        // Verify it's actually a folder
        if (
          folderCheck.data.mimeType !== "application/vnd.google-apps.folder"
        ) {
          console.warn("Student folder ID points to a file, not a folder:", {
            kidUuid,
            folderId: kid.folder_id,
            mimeType: folderCheck.data.mimeType,
          });

          return NextResponse.json({
            files: [],
            nextPageToken: null,
            hasMore: false,
            warning: "Student folder ID is invalid (not a folder)",
          });
        }

        console.info("Successfully validated student folder:", {
          kidUuid,
          folderId: kid.folder_id,
          folderName: folderCheck.data.name,
        });
      } catch (folderError) {
        console.warn("Student folder not accessible in Google Drive:", {
          kidUuid,
          folderId: kid.folder_id,
          error: folderError,
        });

        return NextResponse.json({
          files: [],
          nextPageToken: null,
          hasMore: false,
          warning: "Student folder not found or not accessible",
        });
      }

      // Filter files by the kid's folder
      query.q = `'${kid.folder_id}' in parents and trashed=false`;
    } else {
      // If no kidUuid, just get non-trashed files
      query.q = "trashed=false";
    }

    const res = await drive.files.list(query);

    return NextResponse.json({
      files: res.data.files || [],
      nextPageToken: res.data.nextPageToken,
      hasMore: !!res.data.nextPageToken,
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

    console.error("Google Drive API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch files from Google Drive",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
