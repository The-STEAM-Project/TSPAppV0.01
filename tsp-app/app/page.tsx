"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import {
  QrCode,
  RotateCcw,
  X,
  ExternalLink,
  User,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";

interface Kid {
  id: string;
  name: string;
  googleDriveLink: string;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<"scan" | "result">("scan");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>("");
  const [isScannerPaused, setIsScannerPaused] = useState<boolean>(false);
  const [manualId, setManualId] = useState<string>("");
  const [student, setStudent] = useState<Kid | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleStartScan = () => {
    setIsScanning(true);
    setScanError("");
    setIsScannerPaused(false);
    setManualId("");
  };

  const handleScanResult = async (detectedCodes: IDetectedBarcode[]) => {
    const code = detectedCodes.at(0);
    if (!code) return;

    const studentUuid = code.rawValue.trim();
    await fetchStudentData(studentUuid);
  };

  const handleScanError = (error: unknown) => {
    console.error("Scanner Error:", error);
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;

    await fetchStudentData(manualId.trim());
  };

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId)) {
      setScanError(
        `Invalid student ID format. Please check the unique code or ID and try again.`
      );
      if (isScanning) {
        setIsScannerPaused(true);
      }
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/public/api/kids/${studentId}`,
        {
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setScanError(
            `Student not found. Please verify the unique code or student ID is correct.`
          );
        } else {
          setScanError(
            `Unable to access student information. Please try again later.`
          );
        }
        if (isScanning) {
          setIsScannerPaused(true);
        }
        setLoading(false);
        return;
      }

      const studentData = await response.json();

      setStudent({
        id: studentId,
        name: studentData.name || "Student",
        googleDriveLink: `https://drive.google.com/drive/folders/${studentData.folder_id}`,
      });

      setCurrentStep("result");
      setIsScanning(false);
      setScanError("");
      setIsScannerPaused(false);
    } catch (error) {
      console.error("Error fetching student data:", error);
      setScanError(
        `Connection error. Please check your internet connection and try again.`
      );
      if (isScanning) {
        setIsScannerPaused(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanError("");
    setIsScannerPaused(false);
  };

  const restartFlow = () => {
    setCurrentStep("scan");
    setIsScanning(false);
    setScanError("");
    setIsScannerPaused(false);
    setManualId("");
    setStudent(null);
    setLoading(false);
  };

  if (currentStep === "result" && student) {
    return (
      <div className="min-h-screen p-4">
        <div className="max-w-md mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-center">
                <User className="h-5 w-5" />
                Student Found
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold">{student.name}</h2>
                <p className="text-sm text-gray-500">ID: {student.id}</p>
              </div>

              {student.googleDriveLink && (
                <div className="space-y-3">
                  <h3 className="font-medium text-center">
                    Access Student Files
                  </h3>
                  <Button
                    asChild
                    size="lg"
                    className="w-full flex items-center gap-3 py-6"
                  >
                    <a
                      href={student.googleDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-5 w-5" />
                      Open Google Drive
                    </a>
                  </Button>
                </div>
              )}

              <div className="pt-4 border-t">
                <Button
                  onClick={restartFlow}
                  variant="outline"
                  size="lg"
                  className="w-full flex items-center gap-3 py-4"
                >
                  <RefreshCw className="h-5 w-5" />
                  Scan Another Student
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-md mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Parent Access</h1>
          <p className="text-gray-600">
            Scan your child&apos;s unique code or enter their ID
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Code Scanner
              </CardTitle>
              {isScanning && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopScanning}
                  className="flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <div className="flex justify-center">
                <Button
                  onClick={handleStartScan}
                  size="lg"
                  className="flex items-center gap-3 px-8 py-4"
                  disabled={loading}
                >
                  <QrCode className="h-8 w-8" />
                  <span className="text-lg font-medium">Scan Unique Code</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {!isScannerPaused ? (
                  <>
                    <div className="relative">
                      <div className="w-full max-w-md mx-auto">
                        <Scanner
                          onScan={handleScanResult}
                          onError={handleScanError}
                          styles={{
                            container: {
                              width: "100%",
                            },
                            video: {
                              width: "100%",
                              height: "300px",
                              objectFit: "cover",
                              borderRadius: "8px",
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium">
                        Scanning Unique Code...
                      </p>
                      <p className="text-sm text-gray-500">
                        Point camera at your child&apos;s unique code
                      </p>
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
                          setScanError("");
                        }}
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Try Again
                      </Button>
                    </div>
                    {scanError && (
                      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                        <p className="text-sm font-medium">{scanError}</p>
                        <p className="text-xs mt-1">
                          Click &quot;Try Again&quot; to resume scanning or use
                          entry below.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {!isScanning && (
          <>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Or enter student ID manually
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Manual Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4">
                  <Input
                    type="text"
                    placeholder="Enter student ID"
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    disabled={loading}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={!manualId.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <RotateCcw className="h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Find Student"
                    )}
                  </Button>
                  {scanError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                      <p className="text-sm font-medium">{scanError}</p>
                      <p className="text-xs mt-1">
                        Please check the student ID and try again.
                      </p>
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>

            <div className="text-center mt-8 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Don&apos;t know your child&apos;s unique code?{" "}
                <a
                  href="mailto:office@thesteamproject.ca"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  Contact office@thesteamproject.ca
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
