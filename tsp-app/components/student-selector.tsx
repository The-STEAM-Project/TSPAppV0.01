"use client";

import { Session } from "@supabase/supabase-js";
import QrScanner from "@/components/qr-scanner";
import StudentSearch from "@/components/student-search";

interface StudentSelectorProps {
  session: Session;
}

export default function StudentSelector({ session }: StudentSelectorProps) {
  return (
    <div className="space-y-6 w-full max-w-4xl min-w-[600px] mx-auto">
      {/* QR Code Scanner */}
      <QrScanner />

      {/* OR Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200"></div>
        <span className="text-sm text-gray-500 font-medium">OR</span>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>

      {/* Student Search */}
      <StudentSearch session={session} />
    </div>
  );
}