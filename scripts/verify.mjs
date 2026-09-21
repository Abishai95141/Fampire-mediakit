#!/usr/bin/env node
/**
 * Every check this repo has, in one command.
 *
 *     npm run verify                 the checks that need only a database
 *     npm run verify -- --runtime    …and the browser pass, against a running site
 *     npm run verify -- --coverage   …and the archive coverage measurement
 *
 * ── Why one entry point ─────────────────────────────────────────────────
 *
 * There were six verification scripts and no way to know that from the
 * outside, so in practice one or two got run and the rest rotted. A check
 * nobody remembers to run is not a check. This runs them all, reports which
 * ones passed, and exits non-zero if any did not — so it also works as the
 * single command for CI.
 *
 * Two passes are opt-in, each because it needs something a clone does not have:
 *
 *  --runtime   the site actually serving on BASE (default localhost:3200), and
 *              a Chromium download
 *  --coverage  the raw crawl in data/audit/ and ~/Fampire, which is gitignored
 *              on purpose — 15 MB of per-file records the app never reads
 *
 * Everything in the default set needs only the database in .env. That is the
 * rule: a check that cannot pass on a fresh clone does not belong in the set
 * that runs by default, or the runner teaches people to ignore red.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const withRuntime = process.argv.includes("--runtime");
const withCoverage = process.argv.includes("--coverage");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

/**
 * Every TypeScript check goes through `payload run` — Payload's own loader,
 * already a dependency. `npx tsx` would work too and would pull a package off
 * the network mid-verification, which is exactly what a verification step
 * should not depend on.
 */
const CHECKS = [
  ["catalog invariants", ["npx", ["payload", "run", "scripts/verify-catalog.ts"]]],
  ["editing surface", ["npx", ["payload", "run", "scripts/verify-cms.ts"]]],
  ["search", ["npx", ["payload", "run", "scripts/verify-search.ts"]]],
  ["magazine tree + pickers", ["npx", ["payload", "run", "scripts/verify-magazine-tree.ts"]]],
];

if (withCoverage) {
  CHECKS.push(["archive coverage", ["node", ["scripts/verify-coverage.mjs"]]]);
}
if (withRuntime) {
  CHECKS.push(["runtime (real browser)", ["node", ["scripts/verify-runtime.mjs"]]]);
}

const run = (cmd, args) =>
  new Promise((resolve) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_OPTIONS: "--no-deprecation" },
    });
    let out = "";
    child.stdout.on("data", (b) => (out += b));
    child.stderr.on("data", (b) => (out += b));
    child.on("error", (e) => resolve({ code: 1, out: String(e) }));
    child.on("close", (code) => resolve({ code, out }));
  });

const results = [];
for (const [label, [cmd, args]] of CHECKS) {
  process.stdout.write(`${c.bold("·")} ${label.padEnd(26)}`);
  const { code, out } = await run(cmd, args);
  results.push({ label, code, out });
  console.log(code === 0 ? c.green("pass") : c.red("FAIL"));
}

const failed = results.filter((r) => r.code !== 0);

for (const r of failed) {
  console.log(`\n${c.red("── " + r.label + " ─────────────────────────────")}`);
  // The tail is where an assertion prints; the head is Payload booting.
  console.log(r.out.split("\n").slice(-40).join("\n"));
}

const skipped = [];
if (!withRuntime) skipped.push("  --runtime   every public page in a real browser, with the site running");
if (!withCoverage) skipped.push("  --coverage  archive coverage, if you have the raw crawl in data/audit/");
if (skipped.length) console.log(c.dim(`\nNot run:\n${skipped.join("\n")}`));

console.log(
  failed.length
    ? `\n${c.red(`${failed.length} of ${results.length} checks failed.`)}\n`
    : `\n${c.green(`All ${results.length} checks passed.`)}\n`,
);

process.exit(failed.length ? 1 : 0);
