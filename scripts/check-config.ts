import { messages } from "@/lib/messages";
import { productionConfigProblems } from "@/lib/ops/config";

// Run before the migrations when the app starts in production mode (CLAUDE.md,
// 13. mérföldkő): it stops the start while a setting is missing or wrong, and
// names the settings, never their values.

const problems = productionConfigProblems(process.env);
if (problems.length > 0) {
  console.error(messages.ops.config.failed);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}
console.log(messages.ops.config.ok);
