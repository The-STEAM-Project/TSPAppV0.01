import { requireAdmin } from "@/lib/auth";
import { getGoogleDrive } from "@/lib/google-drive";
import { createSupabaseServer } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const supabase = await createSupabaseServer();
    const drive = getGoogleDrive();

    const { searchParams } = new URL(request.url);
    const kidUuid = searchParams.get("kidUuid");
    const fileName = searchParams.get("fileName");

    if (!kidUuid) {
      return NextResponse.json(
        { error: "kidUuid is required" },
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

    // Get the kid's folder ID from the database
    const { data: kid, error: kidError } = await supabase
      .from("kids")
      .select("folder_id, id")
      .eq("uuid", kidUuid)
      .single();

    if (kidError) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
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

      if (folderCheck.data.mimeType !== "application/vnd.google-apps.folder") {
        return NextResponse.json(
          { error: "Student folder ID is invalid (not a folder)" },
          { status: 400 }
        );
      }
    } catch (folderError) {
      console.warn("Student folder not accessible in Google Drive:", {
        kidUuid,
        folderId: kid.folder_id,
        error: folderError,
      });
      return NextResponse.json(
        { error: "Student folder not found or not accessible" },
        { status: 400 }
      );
    }

    // Handle file upload
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const uploadFileName = fileName || file.name || "untitled";

    // Convert File to Buffer for Google Drive upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: uploadFileName,
        parents: [kid.folder_id],
      },
      media: {
        mimeType: file.type,
        body: buffer,
      },
      fields: "id, name, size, mimeType, createdTime, webViewLink",
    });

    // Log the upload in the database
    const { data: mediaRecord, error: mediaError } = await supabase
      .from("media")
      .insert([
        {
          kid_id: kid.id,
          file_name: uploadFileName,
          uploaded_by: user.id,
          drive_file_id: driveResponse.data.id,
        },
      ])
      .select("id")
      .single();

    if (mediaError) {
      console.warn("Failed to log upload in database:", mediaError);
    }

    return NextResponse.json({
      success: true,
      file: {
        id: driveResponse.data.id,
        name: driveResponse.data.name,
        size: driveResponse.data.size,
        mimeType: driveResponse.data.mimeType,
        createdTime: driveResponse.data.createdTime,
        webViewLink: driveResponse.data.webViewLink,
      },
      mediaId: mediaRecord?.id,
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

    console.error("Google Drive upload error:", error);
    return NextResponse.json(
      {
        error: "Failed to upload file to Google Drive",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
