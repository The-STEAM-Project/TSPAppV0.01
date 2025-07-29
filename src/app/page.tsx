"use client";

import QrScanner from "@/components/qr-scanner";
import ManualStudentEntry from "@/components/manual-student-entry";
import StudentResult from "@/components/student-result";
import { useState } from "react";
import { defaultUrl } from "@/utils";
import { AdminBanner } from "@/components/admin-banner";

interface Student {
  id: string;
  name: string;
  googleDriveLink: string;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<"scan" | "result">("scan");
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);

  const fetchStudentData = async (studentId: string) => {
    setLoading(true);
    setError("");

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(studentId)) {
      setError(
        `Invalid student ID format. Please check the QR code or ID and try again.`
      );
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(
        `${defaultUrl}/api/public/kids/${studentId}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError(
            `Student not found. Please verify the QR code or student ID is correct.`
          );
        } else {
          setError(
            `Unable to access student information. Please try again later.`
          );
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
      setError("");
    } catch (error) {
      console.error("Error fetching student data:", error);
      setError(
        `Connection error. Please check your internet connection and try again.`
      );
    } finally {
      setLoading(false);
    }
  };

  const restartFlow = () => {
    setCurrentStep("scan");
    setStudent(null);
    setLoading(false);
    setError("");
    setIsScanning(false);
  };

  if (currentStep === "result" && student) {
    return <StudentResult student={student} onRestart={restartFlow} />;
  }

  return (
    <div className="p-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <AdminBanner />

        <QrScanner
          onScanResult={fetchStudentData}
          loading={loading}
          onScanningStateChange={setIsScanning}
        />

        {!isScanning && (
          <>
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-4">
                Or enter student ID manually
              </p>
            </div>

            <ManualStudentEntry
              onSubmit={fetchStudentData}
              loading={loading}
              error={error}
            />

            <div className="text-center mt-8 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Don&apos;t know your child&apos;s QR code? Contact{" "}
                <a
                  href="mailto:office@thesteamproject.ca"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  office@thesteamproject.ca
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
