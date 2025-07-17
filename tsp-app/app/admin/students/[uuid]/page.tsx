import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudentDetail from "@/components/student-detail";

export default async function StudentPage({ params }: { params: { uuid: string } }) {
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase.auth.getUser();
  const { data: session, error: sessionError } = await supabase.auth.getSession();

  if (userError || sessionError || !user.user || !session.session) {
    redirect("/");
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(await params.uuid)) {
    redirect("/admin/students");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <StudentDetail
          session={session.session}
          studentUuid={params.uuid}
        />
      </div>
    </div>
  );
}