import { execFileSync } from "node:child_process";

const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const forbiddenFiles = files.filter((file) => /(^|\/)\.env(?:\..+)?$/i.test(file) && file !== ".env.example");
const findings = [...forbiddenFiles.map((file) => `${file}: environment file must not be tracked`)];
const assignment = "(BANK_HISTORY_API_TOKEN|SEPAY_WEBHOOK_API_KEY|VNPAY_HASH_SECRET|WUSROUTER_API_KEY)[[:space:]]*[:=][[:space:]]*['\"]?[A-Za-z0-9_-]{24,}";
for (const [mode, pattern, input] of [
  ["-E", assignment, undefined],
  ["-F", undefined, process.env.BANK_HISTORY_API_TOKEN?.trim()],
]) {
  if (mode === "-F" && !input) continue;
  try {
    const args = ["grep", "--cached", "-I", "-l", mode, ...(pattern ? [pattern] : ["-f", "-"]), "--", "."];
    const matched = execFileSync("git", args, { encoding: "utf8", input: input ? `${input}\n` : undefined });
    for (const file of matched.split("\n").filter(Boolean)) {
      if (file !== ".env.example") findings.push(`${file}: possible hard-coded secret`);
    }
  } catch (error) {
    if (error.status !== 1) throw error;
  }
}

if (findings.length) {
  console.error(`Secret check failed:\n${findings.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Secret check passed (${files.length} tracked files).`);
}
