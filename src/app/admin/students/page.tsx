import StudentSelector from "@/components/student-selector";
import { getSessionOrRedirect } from "@/utils";

export default async function StudentsPage() {
  const { session } = await getSessionOrRedirect();

  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="w-full max-w-4xl mx-auto">
        <h1 className="font-bold text-3xl mb-6">Select Student</h1>
        <StudentSelector session={session} />
      </div>
    </div>
  );
}
