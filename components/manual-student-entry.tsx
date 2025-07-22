"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RotateCcw } from "lucide-react";
import { useState } from "react";

interface ManualStudentEntryProps {
  onSubmit: (studentId: string) => void;
  loading?: boolean;
  error?: string;
}

export default function ManualStudentEntry({
  onSubmit,
  loading,
  error,
}: ManualStudentEntryProps) {
  const [manualId, setManualId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId.trim()) return;
    onSubmit(manualId.trim());
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manual Entry</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <p className="text-sm font-medium">{error}</p>
              <p className="text-xs mt-1">
                Please check the student ID and try again.
              </p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
