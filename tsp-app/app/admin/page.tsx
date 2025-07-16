import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PhotoUploadFlow from "@/components/photo-upload-flow";

export default async function AdminPage() {
  const supabase = await createClient();

  const { data: user, error: userError } = await supabase.auth.getUser();
  const { data: session, error: sessionError } = await supabase.auth.getSession();

  if (userError || sessionError || !user.user || !session.session) {
    redirect("/");
  }

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <PhotoUploadFlow session={session.session} />
      </div>
    </div>
  );
}
