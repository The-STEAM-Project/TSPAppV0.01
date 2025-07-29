"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/utils/types";
import { ArrowLeft, ExternalLink, User } from "lucide-react";

interface StudentResultProps {
  student: Student;
  onRestart: () => void;
}

export default function StudentResult({
  student,
  onRestart,
}: StudentResultProps) {
  return (
    <div className="p-4">
      <div className="max-w-md w-full mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              <User className="h-5 w-5" />
              Student Found
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold">Student</h2>
              <p className="text-sm text-gray-500">ID: {student.uuid}</p>
            </div>

            {student.folder_id && (
              <div className="space-y-3">
                <h3 className="font-medium text-center">
                  Access Student Files
                </h3>
                <Button
                  asChild
                  size="lg"
                  className="w-full flex items-center gap-2 py-6"
                >
                  <a
                    href={`https://drive.google.com/drive/folders/${student.folder_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Drive
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </Button>
              </div>
            )}

            <div className="pt-4 border-t">
              <Button
                onClick={onRestart}
                variant="outline"
                size="lg"
                className="w-full flex items-center gap-2 py-4"
              >
                <ArrowLeft className="h-4 w-4" />
                Scan Another Student
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
