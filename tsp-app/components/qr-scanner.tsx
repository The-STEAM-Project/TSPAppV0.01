"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode, ArrowLeft, RotateCcw } from "lucide-react";

interface QrScannerProps {
  onStudentFound?: (uuid: string) => void;
}

export default function QrScanner({ onStudentFound }: QrScannerProps) {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [qrError, setQrError] = useState<string>("");
  const [isScannerPaused, setIsScannerPaused] = useState<boolean>(false);

  const handleStartScan = () => {
    setIsScanning(true);
    setQrError("");
    setIsScannerPaused(false);
  };

  const handleQrResult = (detectedCodes: IDetectedBarcode[]) => {
    const code = detectedCodes.at(0);
    if (!code) return;

    const studentUuid = code.rawValue.trim();

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentUuid)) {
      setQrError(`Invalid QR code format: ${studentUuid}`);
      setIsScannerPaused(true);
      return;
    }

    // Navigate to student page or call callback
    if (onStudentFound) {
      onStudentFound(studentUuid);
    } else {
      router.push(`/admin/students/${studentUuid}`);
    }
  };

  const handleQrError = (error: unknown) => {
    console.error("QR Scanner Error:", error);
  };

  const stopScanning = () => {
    setIsScanning(false);
    setQrError("");
    setIsScannerPaused(false);
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
              <ArrowLeft className="h-4 w-4" />
              Go Back
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
            >
              <QrCode className="h-8 w-8" />
              <span className="text-lg font-medium">Scan QR Code</span>
            </Button>
          </div>
        ) : (
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
        )}
      </CardContent>
    </Card>
  );
}