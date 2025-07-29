"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Camera,
  Upload,
  Image as ImageIcon,
  X,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { defaultUrl } from "@/utils";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink: string;
  webViewLink: string;
  createdTime: string;
  size?: string;
}

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  timestamp: Date;
}

interface StudentDetailProps {
  studentUuid: string;
  folderID: string;
}

export default function StudentDetail({
  studentUuid,
  folderID,
}: StudentDetailProps) {
  const router = useRouter();
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string>("");
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [driveError, setDriveError] = useState<string>("");
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string>("");
  const [uploadSuccess, setUploadSuccess] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Fetch Google Drive files for the student
  const fetchDriveFiles = useCallback(
    async (kidUuid: string, pageToken?: string) => {
      setLoadingFiles(true);
      setDriveError(""); // Clear previous errors
      try {
        const params = new URLSearchParams({
          kidUuid,
          pageSize: "20",
        });

        if (pageToken) {
          params.append("pageToken", pageToken);
        }

        const response = await fetch(
          `${defaultUrl}/api/protected/integrations/drive/list?${params}`
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage =
            errorData.error ||
            `HTTP ${response.status}: ${response.statusText}`;
          throw new Error(errorMessage);
        }

        const data = await response.json();

        // Check if there's a warning (e.g., folder not accessible)
        if (data.warning) {
          setDriveError(data.warning);
        }

        if (pageToken) {
          setDriveFiles(prev => [...prev, ...data.files]);
        } else {
          setDriveFiles(data.files);
        }

        setNextPageToken(data.nextPageToken || "");
      } catch (error) {
        console.error("Error fetching drive files:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to load photos from Google Drive";
        setDriveError(errorMessage);

        // Don't clear existing files if this was a "load more" request
        if (!pageToken) {
          setDriveFiles([]);
        }
      } finally {
        setLoadingFiles(false);
      }
    },
    []
  );

  useEffect(() => {
    if (studentUuid) {
      fetchDriveFiles(studentUuid);
    }
  }, [fetchDriveFiles, studentUuid]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = e => {
            const newPhoto: UploadedPhoto = {
              id:
                Date.now().toString() +
                Math.random().toString(36).substring(2, 11),
              file,
              preview: e.target?.result as string,
              timestamp: new Date(),
            };
            setUploadedPhotos(prev => [...prev, newPhoto]);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  };

  const handleCameraCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileUpload(event);
  };

  const removePhoto = (photoId: string) => {
    setUploadedPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const uploadToGoogleDrive = async () => {
    if (uploadedPhotos.length === 0) return;

    setUploading(true);
    setUploadError("");
    setUploadSuccess("");

    try {
      const uploadPromises = uploadedPhotos.map(async photo => {
        const formData = new FormData();
        formData.append("file", photo.file);

        const params = new URLSearchParams({
          kidUuid: studentUuid,
          fileName: photo.file.name,
        });

        const response = await fetch(
          `${defaultUrl}/api/protected/integrations/drive/upload?${params}`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Failed to upload ${photo.file.name}`
          );
        }

        return await response.json();
      });

      await Promise.all(uploadPromises);

      // Clear uploaded photos after successful upload
      setUploadedPhotos([]);

      // Refresh the Google Drive files list
      await fetchDriveFiles(studentUuid);

      // Show success message
      const photoCount = uploadPromises.length;
      const successMessage = `Successfully uploaded ${photoCount} photo${photoCount > 1 ? "s" : ""} to Google Drive!`;
      setUploadSuccess(successMessage);

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setUploadSuccess("");
      }, 5000);
    } catch (error) {
      console.error("Error uploading photos:", error);
      setUploadError(
        error instanceof Error
          ? error.message
          : "Failed to upload photos to Google Drive"
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto px-4 sm:px-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-3xl">Student Photos</h1>
          <p className="text-gray-600 mt-1">UUID: {studentUuid}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push("/admin/students")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Selection
        </Button>
      </div>

      {/* Photo Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Upload New Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              onClick={() => cameraInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Upload Files
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
          />
        </CardContent>
      </Card>

      {/* Upload Status Messages */}
      {(uploadError || uploadSuccess) && (
        <div className="space-y-4">
          {uploadError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-start gap-2">
                <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Upload failed</p>
                  <p className="text-xs mt-1">{uploadError}</p>
                </div>
              </div>
            </div>
          )}
          {uploadSuccess && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
              <div className="flex items-start gap-2">
                <Upload className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">Upload successful!</p>
                  <p className="text-xs mt-1">{uploadSuccess}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Newly Uploaded Photos */}
      {uploadedPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                New Photos ({uploadedPhotos.length})
              </div>
              <Button
                onClick={uploadToGoogleDrive}
                disabled={uploading}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload to Google Drive"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedPhotos.map(photo => (
                <div key={photo.id} className="relative group">
                  <Image
                    src={photo.preview}
                    alt="Uploaded photo"
                    width={200}
                    height={128}
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                  <button
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                  <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                    {photo.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Google Drive Photos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Existing Photos ({driveFiles.length})
            </div>
            <Button
              asChild
              size="sm"
              className="flex items-center gap-2 w-fit"
              variant="link"
            >
              <a
                href={`https://drive.google.com/drive/folders/${folderID}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open in Google Drive
                <ExternalLink className="h-1 w-1" />
              </a>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {driveError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <div className="flex items-start gap-2">
                <X className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    Failed to load Google Drive photos
                  </p>
                  <p className="text-xs mt-1">{driveError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchDriveFiles(studentUuid)}
                    className="mt-2 text-xs"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
          {loadingFiles ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading existing photos...</p>
            </div>
          ) : driveFiles.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {driveFiles.map(file => (
                  <div key={file.id} className="relative group">
                    {file.mimeType?.startsWith("image/") ? (
                      <Image
                        src={file.thumbnailLink}
                        alt={file.name}
                        width={200}
                        height={128}
                        className="w-full h-32 object-cover rounded-lg border"
                        onError={e => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          target.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center ${file.mimeType?.startsWith("image/") ? "hidden" : ""}`}
                    >
                      <div className="text-center">
                        <ImageIcon className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                        <p className="text-xs text-gray-600 truncate px-2">
                          {file.name}
                        </p>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded">
                      {new Date(file.createdTime).toLocaleDateString()}
                    </div>
                    <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded transition-opacity">
                      <a
                        href={file.webViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-white hover:text-blue-300"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>
              {nextPageToken && (
                <div className="mt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchDriveFiles(studentUuid, nextPageToken)}
                    disabled={loadingFiles}
                  >
                    Load More
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">
                No existing photos found for this student
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
