import { createInterface } from "node:readline/promises";
import { prisma } from "@/lib/db";
import { messages } from "@/lib/messages";
import { fmt } from "@/lib/messages/format";
import { createFirstAdmin, hasActiveAdmin, parseFirstAdmin } from "@/lib/ops/first-admin";

// Makes the first admin of a production server (CLAUDE.md, 13. mérföldkő):
//   docker compose -f docker-compose.prod.yml exec app npx tsx scripts/create-admin.ts
// Asks for the name, the user name and the password twice; the password is not
// shown while typed. Refuses once an active admin exists.

const t = messages.ops.admin;

/** Reads one line without echoing it; from a pipe it simply reads the next line. */
function askHidden(prompt: string, lines: AsyncIterator<string> | null): Promise<string> {
  process.stdout.write(prompt);
  if (lines) return lines.next().then((line) => (line.done ? "" : line.value));
  const stdin = process.stdin;
  return new Promise((resolve, reject) => {
    let value = "";
    const finish = (error?: Error) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish();
        if (char === "\u0003") return finish(new Error(t.cancelled));
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else value += char;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function main() {
  console.log(t.title);
  if (await hasActiveAdmin()) {
    console.error(t.exists);
    process.exitCode = 1;
    return;
  }
  const interactive = Boolean(process.stdin.isTTY);
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: interactive });
  const lines = interactive ? null : rl[Symbol.asyncIterator]();
  const ask = async (prompt: string) => {
    if (!lines) return rl.question(prompt);
    process.stdout.write(prompt);
    const line = await lines.next();
    return line.done ? "" : line.value;
  };

  const name = await ask(t.name);
  const username = await ask(t.username);
  if (interactive) rl.close();
  const password = await askHidden(t.password, lines);
  const again = await askHidden(t.passwordAgain, lines);
  if (!interactive) rl.close();

  if (password !== again) throw new Error(t.mismatch);
  const checked = parseFirstAdmin({ name, username, password });
  if (!checked.ok) throw new Error(checked.error);
  const result = await createFirstAdmin({ name, username, password });
  if (!result.ok) throw new Error(result.error);
  console.log(fmt(t.created, { name: checked.data.name, username: result.username }));
}

main()
  .catch((error: Error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
