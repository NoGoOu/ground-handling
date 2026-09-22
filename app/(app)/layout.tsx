import { AppHeader } from "@/components/app-header";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await requireUser();
  return (
    <>
      <AppHeader user={user} />
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6">{children}</div>
    </>
  );
}
