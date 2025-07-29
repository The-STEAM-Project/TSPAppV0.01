"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import { defaultUrl } from "@/utils";
import { Student } from "@/utils/types";

export default function StudentSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [loadingSearch, setLoadingSearch] = useState<boolean>(false);
  const [searchPage, setSearchPage] = useState<number>(1);
  const [hasMoreResults, setHasMoreResults] = useState<boolean>(false);

  // Search for kids using the API
  const searchKids = useCallback(
    async (searchTerm: string, page: number = 1) => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        return;
      }

      setLoadingSearch(true);
      try {
        const params = new URLSearchParams({
          search: searchTerm.trim(),
          page: page.toString(),
          limit: "10",
        });

        const response = await fetch(
          `${defaultUrl}/api/protected/kids?${params}`
        );

        if (!response.ok) {
          throw new Error("Failed to search students");
        }

        const data = await response.json();

        if (page === 1) {
          setSearchResults(data.kids);
        } else {
          setSearchResults(prev => [...prev, ...data.kids]);
        }

        setHasMoreResults(data.pagination.hasMore);
        setSearchPage(page);
      } catch (error) {
        console.error("Error searching kids:", error);
        setSearchResults([]);
      } finally {
        setLoadingSearch(false);
      }
    },
    []
  );

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm.trim()) {
        searchKids(searchTerm, 1);
      } else {
        setSearchResults([]);
        setSearchPage(1);
        setHasMoreResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchKids, searchTerm]);

  const handleStudentSelect = async (uuid: string) => {
    // Navigate directly - the student page will handle UUID validation
    // using the /kids/uuid endpoint and redirect if invalid
    router.push(`/admin/students/${uuid}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Search Students
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 relative">
          <Label htmlFor="student-search">Search by Student UUID</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="student-search"
              placeholder="Enter student UUID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Search Results */}
          {searchTerm.trim() && (
            <div className="absolute z-10 w-full mt-1 border rounded-md bg-white shadow-lg max-h-60 overflow-y-auto overflow-x-auto">
              {loadingSearch ? (
                <div className="p-4 text-center text-gray-500">
                  <p>Searching...</p>
                </div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map(kid => (
                    <button
                      key={kid.uuid}
                      onClick={() => handleStudentSelect(kid.uuid)}
                      className="w-full text-left p-3 hover:bg-gray-50 border-b last:border-b-0 transition-colors block"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium text-sm break-all">
                          UUID: {kid.uuid}
                        </span>
                        <span className="text-xs text-gray-500 break-all">
                          Folder ID: {kid.folder_id || "Not configured"}
                        </span>
                      </div>
                    </button>
                  ))}
                  {hasMoreResults && (
                    <button
                      onClick={() => searchKids(searchTerm, searchPage + 1)}
                      disabled={loadingSearch}
                      className="w-full p-3 text-center text-blue-600 hover:bg-blue-50 text-sm"
                    >
                      Load More Results
                    </button>
                  )}
                </>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  <p className="text-sm">No students found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
