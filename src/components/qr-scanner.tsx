"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { defaultUrl } from "@/utils";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { QrCode, RotateCcw, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface QrScannerProps {
  // Callback mode - if provided, will call this instead of navigating
  onScanResult?: (studentId: string) => void;
  onScanningStateChange?: (isScanning: boolean) => void;
  loading?: boolean;
}

export default function QrScanner({
  onScanResult,
  onScanningStateChange,
  loading,
}: QrScannerProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>("");
  const [isScannerPaused, setIsScannerPaused] = useState<boolean>(false);

  const handleStartScan = () => {
    setIsScanning(true);
    setScanError("");
    setIsScannerPaused(false);
    onScanningStateChange?.(true);
  };

  const handleScanResult = async (detectedCodes: IDetectedBarcode[]) => {
    const code = detectedCodes.at(0);
    if (!code) return;

    const studentUuid = code.rawValue.trim();

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentUuid)) {
      setScanError(
        `Invalid student ID format. Please check the QR code or ID and try again.`
      );
      setIsScannerPaused(true);
      return;
    }

    // If callback mode, just call the callback
    if (onScanResult) {
      onScanResult(studentUuid);
      return;
    }

    // Otherwise, validate and navigate (admin mode)
    try {
      const response = await fetch(
        `${defaultUrl}/api/public/kids/${studentUuid}`
      );

      if (!response.ok) {
        setScanError(`Student not found for ID: ${studentUuid}`);
        setIsScannerPaused(true);
        return;
      }

      // Student exists, navigate to student page
      router.push(`/admin/students/${studentUuid}`);
    } catch (error) {
      console.error("Error validating student UUID:", error);
      setScanError(`Failed to validate student: ${studentUuid}`);
      setIsScannerPaused(true);
    }
  };

  const handleScanError = (error: unknown) => {
    console.error("Scanner Error:", error);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setScanError("");
    setIsScannerPaused(false);
    onScanningStateChange?.(false);
  };

  const resumeScanning = () => {
    setIsScannerPaused(false);
    setScanError("");
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code Scanner
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
              <span className="text-md font-medium">Scan QR Code</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {!isScannerPaused ? (
              <>
                <div className="relative">
                  <div className="w-full max-w-4xl mx-auto">
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
                  <p className="text-lg font-medium">Scanning QR Code...</p>
                  <p className="text-sm text-gray-500">
                    Point camera at student&apos;s QR code
                  </p>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-full max-w-4xl mx-auto h-[300px] bg-gray-100 rounded-lg flex flex-col items-center justify-center space-y-4">
                  <div className="text-center space-y-2">
                    <QrCode className="h-16 w-16 mx-auto text-gray-400" />
                    <p className="text-gray-500">Scanner Paused</p>
                  </div>
                  <Button
                    onClick={resumeScanning}
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
                      manual search.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
