"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLink, RefreshCw, User } from "lucide-react";

interface Student {
  id: string;
  name: string;
  googleDriveLink: string;
}

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
                onClick={onRestart}
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
