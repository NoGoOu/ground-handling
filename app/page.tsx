import { messages } from "@/lib/messages";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 p-6">
      <h1 className="text-3xl font-bold">{messages.app.name}</h1>
      <p className="text-lg text-neutral-700">{messages.app.description}</p>
      <p className="text-neutral-500">{messages.home.underConstruction}</p>
    </main>
  );
}
