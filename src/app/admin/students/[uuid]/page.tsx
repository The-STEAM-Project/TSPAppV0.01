import { redirect } from "next/navigation";
import StudentDetail from "@/components/student-detail";
import { defaultUrl } from "@/utils";
import { withAuth } from "@/utils/with-auth";
import { Student } from "@/utils/types";

async function StudentPage(props: { params: Promise<{ uuid: string }> }) {
  const params = await props.params;

  // Validate that the student exists using the /kids/uuid endpoint
  try {
    const response = await fetch(
      `${defaultUrl}/api/public/kids/${params.uuid}`
    );

    if (!response.ok) {
      // Student not found or other error
      console.error(
        `Student validation failed: ${response.status} ${response.statusText}`
      );
      redirect("/admin/students");
    }

    const data: Student = await response.json();

    return (
      <div className="flex-1 w-full flex flex-col gap-6 p-6">
        <div className="w-full max-w-4xl mx-auto">
          <StudentDetail studentUuid={params.uuid} folderID={data.folder_id} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error validating student UUID:", error);
    redirect("/admin/students");
  }
}

export default withAuth(StudentPage);
