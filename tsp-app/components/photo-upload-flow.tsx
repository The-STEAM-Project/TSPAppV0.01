"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Session } from "@supabase/supabase-js";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import {
  ArrowLeft,
  Camera,
  GraduationCap,
  Image as ImageIcon,
  QrCode,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

interface PhotoUploadFlowProps {
  session: Session;
}

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  timestamp: Date;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  webViewLink: string;
  createdTime: string;
}

interface Kid {
  uuid: string;
  folder_id: string;
}

export default function PhotoUploadFlow({ session }: PhotoUploadFlowProps) {
  const [selectedKid, setSelectedKid] = useState<string>("");
  const [kidSearchTerm, setKidSearchTerm] = useState<string>("");
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [isQrMode, setIsQrMode] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string>("");
  const [isScannerPaused, setIsScannerPaused] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState<boolean>(false);
  const [nextPageToken, setNextPageToken] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Kid[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Search for kids using the API
  const searchKids = useCallback(async (searchTerm: string, page: number = 1) => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    setLoadingSearch(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm.trim(),
        page: page.toString(),
        limit: "10",
      });

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/protected/api/kids?${params}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to search students");
      }

      const data = await response.json();

      if (page === 1) {
        setSearchResults(data.kids);
      } else {
        setSearchResults(prev => [...prev, ...data.kids]);
      }

      setHasMoreResults(data.pagination.hasMore);
      setSearchPage(page);
    } catch (error) {
      console.error("Error searching kids:", error);
      setSearchResults([]);
    } finally {
      setLoadingSearch(false);
    }
  }, [session?.access_token]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (kidSearchTerm.trim()) {
        searchKids(kidSearchTerm, 1);
      } else {
        setSearchResults([]);
        setSearchPage(1);
        setHasMoreResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [kidSearchTerm, searchKids]);

  const handleQrScan = () => {
    setIsQrMode(true);
    setQrError(""); // Clear any previous errors
    setIsScannerPaused(false); // Resume scanner
  };

  const handleQrResult = (detectedCodes: IDetectedBarcode[]) => {
    const code = detectedCodes.at(0)
    if (!code) return

    // Parse the QR code result - assuming it contains student UUID
    const studentUuid = code.rawValue.trim();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentUuid)) {
      setQrError(`Invalid QR code format: ${studentUuid}`);
      setIsScannerPaused(true);
      return;
    }

    // Set the selected student UUID directly
    setSelectedKid(studentUuid);
    setIsQrMode(false);
    setQrError(""); // Clear any previous errors
    setIsScannerPaused(false);
  };

  const handleQrError = (error: unknown) => {
    setQrError(error instanceof Error && error.name === "NotAllowedError" ? 'Please ensure you have given us permission!' : 'Unknown error');
  };

  const stopQrScanning = () => {
    setIsQrMode(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const newPhoto: UploadedPhoto = {
              id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
              file,
              preview: e.target?.result as string,
              timestamp: new Date(),
            };
            setUploadedPhotos((prev) => [...prev, newPhoto]);
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
    setUploadedPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
  };

  const fetchDriveFiles = useCallback(async (kidUuid: string, pageToken?: string) => {
    setLoadingFiles(true);
    try {
      const params = new URLSearchParams({
        kidUuid,
        pageSize: "20",
      });

      if (pageToken) {
        params.append("pageToken", pageToken);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/protected/api/integrations/drive/list?${params}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }

      const data = await response.json();

      if (pageToken) {
        // Append to existing files for pagination
        setDriveFiles(prev => [...prev, ...data.files]);
      } else {
        // Replace files for initial load
        setDriveFiles(data.files);
      }

      setNextPageToken(data.nextPageToken || "");
    } catch (error) {
      console.error("Error fetching drive files:", error);
    } finally {
      setLoadingFiles(false);
    }
  }, [session?.access_token]);

  const restartFlow = () => {
    setSelectedKid("");
    setKidSearchTerm("");
    setUploadedPhotos([]);
    setDriveFiles([]);
    setNextPageToken("");
    setIsQrMode(false);
  };

  // Fetch Google Drive files when a student is selected
  useEffect(() => {
    if (selectedKid) {
      fetchDriveFiles(selectedKid);
    }
  }, [fetchDriveFiles, selectedKid]);

  return (
    <div className="space-y-6 w-full max-w-4xl min-w-[600px] mx-auto">
      {/* QR Code Scanner or Kid Selection - Only show when no student is selected */}
      {!selectedKid && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Select Student
              </CardTitle>
              {isQrMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopQrScanning}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go Back
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isQrMode ? (
              <div className="space-y-4">
                {!isScannerPaused ? (
                  <>
                    <div className="relative">
                      <div className="w-full max-w-md mx-auto">
                        <Scanner
                          onScan={handleQrResult}
                          onError={handleQrError}
                          styles={{
                            container: {
                              width: "100%",
                            },
                            video: {
                              width: "100%",
                              height: "300px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            }
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium">Scanning QR Code...</p>
                      <p className="text-sm text-gray-500">Point camera at student&apos;s QR code</p>
                    </div>
                  </>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-full max-w-md mx-auto h-[300px] bg-gray-100 rounded-lg flex flex-col items-center justify-center space-y-4">
                      <div className="text-center space-y-2">
                        <QrCode className="h-16 w-16 mx-auto text-gray-400" />
                        <p className="text-gray-500">Scanner Paused</p>
                      </div>
                      <Button
                        onClick={() => {
                          setIsScannerPaused(false);
                          setQrError("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Try Again
                      </Button>
                    </div>
                    {qrError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        <p className="text-sm font-medium">{qrError}</p>
                        <p className="text-xs mt-1">Click &quot;Try Again&quot; to resume scanning or use manual search.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <Button
                    onClick={handleQrScan}
                    size="lg"
                    className="flex items-center gap-3 px-8 py-4"
                  >
                    <QrCode className="h-8 w-8" />
                    <span className="text-md font-medium">Scan QR Code</span>
                  </Button>
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500 font-medium">OR</span>
                  <div className="flex-1 h-px bg-gray-200"></div>
                </div>

                <div className="space-y-2 relative">
                  <Label htmlFor="kid-search">Search by Student UUID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="kid-search"
                      placeholder="Enter student UUID..."
                      value={kidSearchTerm}
                      onChange={(e) => setKidSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Search Results */}
                  {kidSearchTerm.trim() && (
                    <div className="absolute z-10 w-full mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto">
                      {loadingSearch ? (
                        <div className="p-4 text-center text-gray-500">
                          <p>Searching...</p>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <>
                          {searchResults.map((kid) => (
                            <button
                              key={kid.uuid}
                              onClick={() => {
                                setSelectedKid(kid.uuid);
                                setKidSearchTerm("");
                                setSearchResults([]);
                              }}
                              className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors block"
                            >
                              <div className="flex flex-col min-w-0 overflow-hidden">
                                <span className="font-medium text-sm truncate">UUID: {kid.uuid}</span>
                                <span className="text-xs text-gray-500 truncate">
                                  Folder ID: {kid.folder_id || 'Not configured'}
                                </span>
                              </div>
                            </button>
                          ))}
                          {hasMoreResults && (
                            <button
                              onClick={() => searchKids(kidSearchTerm, searchPage + 1)}
                              disabled={loadingSearch}
                              className="w-full p-3 text-center text-blue-600 hover:bg-blue-50 text-sm"
                            >
                              Load More Results
                            </button>
                          )}
                        </>
                      ) : (
                        <div className="p-4 text-center text-gray-500">
                          <p className="text-sm">No students found</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Student Info */}
      {selectedKid && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Selected Student</h3>
                <p className="text-sm text-gray-500">
                  UUID: {selectedKid}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={restartFlow}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Photo Upload Section */}
      {selectedKid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Upload Photos
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
      )}

      {/* Existing Google Drive Files */}
      {selectedKid && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Existing Photos ({driveFiles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading existing photos...</p>
              </div>
            ) : driveFiles.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {driveFiles.map((file) => (
                    <div key={file.id} className="relative group">
                      {file.mimeType?.startsWith('image/') && file.thumbnailLink ? (
                        <Image
                          src={file.thumbnailLink}
                          alt={file.name}
                          width={200}
                          height={128}
                          className="w-full h-32 object-cover rounded-lg border"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            target.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-full h-32 bg-gray-100 rounded-lg border flex items-center justify-center ${file.mimeType?.startsWith('image/') && file.thumbnailLink ? 'hidden' : ''}`}>
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
                      <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white hover:text-blue-200"
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
                      onClick={() => fetchDriveFiles(selectedKid, nextPageToken)}
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
                <p className="text-gray-500">No existing photos found for this student</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Uploaded Photos Display */}
      {uploadedPhotos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Uploaded Photos ({uploadedPhotos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {uploadedPhotos.map((photo) => (
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


    </div>
  );
}