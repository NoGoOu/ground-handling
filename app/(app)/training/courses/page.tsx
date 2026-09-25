import Link from "next/link";
import { listCourses, listQualifications } from "@/lib/data/training";
import { messages } from "@/lib/messages";
import { canManageTraining } from "@/lib/permissions";
import { requireCapability } from "@/lib/session";
import { saveCourse } from "../actions";
import { CourseForm } from "../forms";

const t = messages.training;

export default async function CoursesPage() {
  await requireCapability(canManageTraining);
  const [courses, qualifications] = await Promise.all([listCourses(), listQualifications()]);
  const active = qualifications.filter((q) => q.active);
  const c = t.courses;
  return (
    <div className="flex flex-col gap-4">
      <Link href="/training" className="self-start text-sm text-sky-700 hover:underline">
        {t.back}
      </Link>
      <h1 className="text-2xl font-bold">{c.title}</h1>
      <section className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="font-semibold">{c.create}</h2>
        <CourseForm
          action={saveCourse.bind(null, null)}
          initial={{ name: "", qualificationId: "", hasExam: "", passPercent: "" }}
          qualifications={active}
          submitLabel={c.create}
        />
      </section>
      {courses.length === 0 ? (
        <p className="text-neutral-600">{c.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {courses.map((course) => (
            <li key={course.id} className="rounded-xl border border-neutral-200 bg-white p-4">
              <CourseForm
                action={saveCourse.bind(null, course.id)}
                initial={{
                  name: course.name,
                  qualificationId: course.qualificationId ?? "",
                  hasExam: course.hasExam ? "on" : "",
                  passPercent: course.passPercent === null ? "" : String(course.passPercent),
                }}
                // An inactive qualification stays on the course that has it (approved decision 1).
                qualifications={
                  course.qualification && !course.qualification.active ? [...active, course.qualification] : active
                }
                submitLabel={messages.form.save}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
