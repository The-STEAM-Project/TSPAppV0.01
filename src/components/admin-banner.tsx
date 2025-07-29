"use client";

import { createSupabaseClient } from "@/lib/supabase/client";
import Link from "next/link";
import { InfoIcon } from "lucide-react";
import { useEffect, useState } from "react";

export function AdminBanner() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      const supabase = createSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsAdmin(!!user);
      setLoading(false);
    };

    checkAdminStatus();
  }, []);

  // Don't show anything while loading or if not admin
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <div className="w-full bg-blue-50 rounded-lg">
      <div className="max-w-4xl mx-auto px-5 py-3">
        <div className="flex items-center gap-3 text-blue-800">
          <InfoIcon className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">
              You have admin access.{" "}
              <Link
                href="/admin/students"
                className="underline hover:text-blue-900 font-semibold"
              >
                Go to Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
