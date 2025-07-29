import StudentSelector from "@/components/student-selector";
import { withAuth } from "@/utils/with-auth";

function StudentsPage() {
  return (
    <div className="flex-1 w-full flex flex-col gap-6 p-6">
      <div className="w-full max-w-md mx-auto">
        <h1 className="font-bold text-3xl mb-6">Select Student</h1>
        <StudentSelector />
      </div>
    </div>
  );
}

export default withAuth(StudentsPage);
