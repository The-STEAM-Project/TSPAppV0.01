import { requireAdmin } from "@/lib/auth";
import { getGoogleDrive } from "@/lib/google-drive";
import { ensureStudentFolder } from "@/lib/google-drive-folders";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { Readable } from "stream";

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();
    const supabase = createSupabaseAdmin();
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
      return NextResponse.json(
        {
          error: "Student not found",
          details: `No student found with UUID: ${kidUuid}`,
        },
        { status: 404 }
      );
    }

    // Ensure student has a folder (create if doesn't exist)
    let folderId: string;
    try {
      const folderResult = await ensureStudentFolder(kidUuid, kid.folder_id);

      folderId = folderResult.folderId;

      // Update database if folder ID changed or was null
      if (kid.folder_id !== folderId) {
        const { error: updateError } = await supabase
          .from("kids")
          .update({ folder_id: folderId })
          .eq("uuid", kidUuid);

        if (updateError) {
          console.warn("Failed to update folder ID in database:", updateError);
        }
      }
    } catch (folderError) {
      console.error("Failed to ensure student folder:", folderError);
      return NextResponse.json(
        {
          error: "Failed to create or access student folder",
          details:
            folderError instanceof Error
              ? folderError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }

    // Handle file upload
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const uploadFileName = fileName || file.name || "untitled";

    // Convert File to Buffer and then to readable stream for Google Drive upload
    const buffer = Buffer.from(await file.arrayBuffer());
    const stream = Readable.from(buffer);

    // Upload to Google Drive
    const driveResponse = await drive.files.create({
      requestBody: {
        name: uploadFileName,
        parents: [folderId],
      },
      media: {
        mimeType: file.type,
        body: stream,
      },
      fields: "id, name, size, mimeType, createdTime, webViewLink",
      supportsAllDrives: true,
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
