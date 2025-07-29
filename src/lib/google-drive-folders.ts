import { getGoogleDrive } from "@/lib/google-drive";

export interface CreateFolderResult {
  folderId: string;
  folderName: string;
  webViewLink: string;
}

/**
 * Creates a folder in Google Drive and shares it with the service account
 */
export async function createStudentFolder(
  studentUuid: string
): Promise<CreateFolderResult> {
  const drive = getGoogleDrive();

  // Create folder name using just the student UUID
  const folderName = studentUuid;

  // Get the shared drive ID from environment variable
  const sharedDriveId = process.env.SHARED_DRIVE_ID;

  if (!sharedDriveId) {
    throw new Error(
      "SHARED_DRIVE_ID environment variable is required for folder creation"
    );
  }

  try {
    // Verify the shared drive exists and is accessible
    try {
      await drive.drives.get({
        driveId: sharedDriveId,
      });
    } catch {
      throw new Error(
        `Shared drive ${sharedDriveId} not found or not accessible. Make sure the service account has access to this shared drive.`
      );
    }

    // Create the folder in the shared drive
    const folderResponse = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
        parents: [sharedDriveId], // Use shared drive as parent
      },
      fields: "id, name, webViewLink",
      supportsAllDrives: true,
    });

    const folderId = folderResponse.data.id!;

    // Make the folder accessible to anyone with the link
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          role: "reader", // Can view files but not edit
          type: "anyone", // Anyone with the link
        },
        supportsAllDrives: true,
      });
    } catch (permissionError) {
      console.warn(
        `Failed to set public permissions for folder ${folderId}:`,
        permissionError
      );
      // Continue anyway - folder is still created and accessible to service account
    }

    return {
      folderId,
      folderName,
      webViewLink: folderResponse.data.webViewLink!,
    };
  } catch (error) {
    console.error("Failed to create student folder:", error);
    throw new Error(
      `Failed to create folder for student: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Ensures a student has a folder, creating one if it doesn't exist
 */
export async function ensureStudentFolder(
  studentUuid: string,
  currentFolderId?: string | null
): Promise<CreateFolderResult> {
  const drive = getGoogleDrive();

  // If folder ID exists, verify it's still accessible
  if (currentFolderId) {
    try {
      const folderCheck = await drive.files.get({
        fileId: currentFolderId,
        fields: "id, name, mimeType, webViewLink",
        supportsAllDrives: true,
      });

      if (folderCheck.data.mimeType === "application/vnd.google-apps.folder") {
        return {
          folderId: currentFolderId,
          folderName: folderCheck.data.name!,
          webViewLink: folderCheck.data.webViewLink!,
        };
      }
    } catch {
      // Existing folder not accessible, will create new one
    }
  }

  // Create new folder
  return await createStudentFolder(studentUuid);
}
