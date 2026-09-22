import Link from "next/link";
import { messages } from "@/lib/messages";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">404</h1>
      <p className="text-neutral-700">{messages.errors.notFound}</p>
      <Link href="/" className="btn btn-primary">
        {messages.errors.backHome}
      </Link>
    </main>
  );
}
