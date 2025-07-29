"use client";

import QrScanner from "@/components/qr-scanner";
import StudentSearch from "@/components/student-search";
import { useState } from "react";

export default function StudentSelector() {
  const [isScanning, setIsScanning] = useState<boolean>(false);

  return (
    <div className="space-y-6 w-full">
      {/* QR Code Scanner */}
      <div className="w-full">
        <QrScanner onScanningStateChange={setIsScanning} />
      </div>

      {!isScanning && (
        <>
          {/* OR Divider */}
          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-gray-200"></div>
            <span className="text-sm text-gray-500 font-medium">OR</span>
            <div className="flex-1 h-px bg-gray-200"></div>
          </div>

          {/* Student Search */}
          <div className="w-full">
            <StudentSearch />
          </div>
        </>
      )}
    </div>
  );
}
