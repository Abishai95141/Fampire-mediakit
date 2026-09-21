#!/usr/bin/env node
/**
 * One command from a fresh clone to a running site.
 *
 *     npm run setup
 *
 * It writes .env if you have none, waits for Postgres, creates the database,
 * applies every migration, makes you an admin account, and loads the catalog
 * and the pages. Then `npm run dev`.
 *
 * ── Why a script and not a list of steps in the README ──────────────────
 *
 * The steps have a required ORDER that is invisible from the outside: brands
 * before entries because entries reference them; an admin user before the
 * landing page because the page records who published it; the catalog before
 * the landing page because the page resolves people by slug. Get the order
 * wrong and nothing errors loudly — you get a site with empty sections and no
 * indication which step was skipped. A README cannot enforce an order. This
 * can.
 *
 * ── Safe to run twice ───────────────────────────────────────────────────
 *
 * Every step is idempotent: .env is written only when absent, the database is
 * created only when missing, migrations skip what is applied, and each seed
 * upserts. So this doubles as the repair path when something is half-built —
 * run it again rather than reasoning about which half.
 *
 * Nothing here touches anything but the database this .env points at.
 */

import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

import pg from "pg";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ENV_FILE = path.join(ROOT, ".env");
const EXAMPLE = path.join(ROOT, ".env.example");

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
};

let step = 0;
const say = (msg) => console.log(`\n${c.bold(`[${++step}]`)} ${c.bold(msg)}`);
const ok = (msg) => console.log(`    ${c.green("✓")} ${msg}`);
const note = (msg) => console.log(`    ${c.dim(msg)}`);

function die(msg, hint) {
  console.error(`\n${c.red("✗")} ${msg}`);
  if (hint) console.error(`\n${hint}\n`);
  process.exit(1);
}

// ── 0. Node ─────────────────────────────────────────────────────────────

const major = Number(process.versions.node.split(".")[0]);
if (major < 20) {
  die(
    `Node ${process.versions.node} is too old — this needs Node 20 or newer.`,
    `  The version this is developed against is in .nvmrc:\n    nvm use    # or install Node 22 from nodejs.org`,
  );
}

// ── 1. .env ─────────────────────────────────────────────────────────────

say("Environment");

const newSecret = () => crypto.randomBytes(32).toString("hex");

if (!fs.existsSync(ENV_FILE)) {
  if (!fs.existsSync(EXAMPLE)) die(".env.example is missing — this clone is incomplete.");
  const filled = fs
    .readFileSync(EXAMPLE, "utf8")
    .replace(/^PAYLOAD_SECRET=.*$/m, `PAYLOAD_SECRET=${newSecret()}`);
  fs.writeFileSync(ENV_FILE, filled, { mode: 0o600 });
  ok("wrote .env from .env.example, with a freshly generated PAYLOAD_SECRET");
  note("it is gitignored — nothing in it will ever be committed");
} else {
  ok(".env already exists — leaving it alone");
}

/** Parse .env ourselves: this runs before Payload, which is what loads it normally. */
function readEnvFile(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const env = { ...readEnvFile(ENV_FILE) };

if (!env.PAYLOAD_SECRET) {
  const secret = newSecret();
  fs.appendFileSync(ENV_FILE, `\nPAYLOAD_SECRET=${secret}\n`);
  env.PAYLOAD_SECRET = secret;
  ok("PAYLOAD_SECRET was blank — generated one and appended it");
}
if (!env.DATABASE_URI) {
  die(
    "DATABASE_URI is not set in .env.",
    `  Either start the bundled Postgres:\n    docker compose up -d\n\n  …or point it at a server you already run, e.g.\n    DATABASE_URI=postgres://localhost:5432/fampire_media_center`,
  );
}

// ── 2. Postgres ─────────────────────────────────────────────────────────

say("Database");

const uri = new URL(env.DATABASE_URI);
const dbName = decodeURIComponent(uri.pathname.replace(/^\//, ""));
if (!dbName) die(`DATABASE_URI has no database name: ${env.DATABASE_URI}`);

const ssl = env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined;
/** Connect to the server's own `postgres` database to ask about, or create, ours. */
const adminUri = new URL(env.DATABASE_URI);
adminUri.pathname = "/postgres";

const DOCKER_HINT = `  Start the bundled Postgres — no install needed beyond Docker:

    docker compose up -d

  Already run your own Postgres? Point DATABASE_URI at it in .env instead.
  On macOS with Homebrew:

    brew services start postgresql@16
    # then set, in .env:
    #   DATABASE_URI=postgres://localhost:5432/fampire_media_center`;

async function reachable(timeoutMs = 60_000) {
  const started = Date.now();
  let last;
  for (;;) {
    const client = new pg.Client({ connectionString: adminUri.toString(), ssl });
    try {
      await client.connect();
      await client.end();
      return;
    } catch (e) {
      last = e;
      try { await client.end(); } catch {}
      if (Date.now() - started > timeoutMs) throw last;
      if (Date.now() - started < 1500) process.stdout.write(`    ${c.dim("waiting for Postgres")}`);
      else process.stdout.write(c.dim("."));
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

try {
  await reachable();
  process.stdout.write("\n");
  ok(`Postgres is up at ${uri.host}`);
} catch (e) {
  process.stdout.write("\n");
  die(`Could not reach Postgres at ${uri.host} — ${e.message}`, DOCKER_HINT);
}

{
  const client = new pg.Client({ connectionString: adminUri.toString(), ssl });
  await client.connect();
  const { rowCount } = await client.query("select 1 from pg_database where datname = $1", [dbName]);
  if (rowCount) {
    ok(`database "${dbName}" already exists`);
  } else {
    // Quoted identifier: a database name is not a parameter, and an unquoted
    // one would silently lowercase.
    await client.query(`create database "${dbName.replace(/"/g, '""')}"`);
    ok(`created database "${dbName}"`);
  }
  await client.end();
}

// ── Runner ──────────────────────────────────────────────────────────────

/** Run a command with .env in the environment, streaming its output through. */
function run(cmd, args, { extraEnv = {}, label } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env, ...extraEnv, NODE_OPTIONS: "--no-deprecation" },
    });
    const lines = [];
    const keep = (buf) => {
      const text = buf.toString();
      lines.push(text);
      // Payload is chatty on boot; show the script's own output, not its scaffolding.
      for (const line of text.split("\n")) {
        if (!line.trim()) continue;
        if (/^\[\d\d:\d\d:\d\d\]/.test(line) && !/error|warn/i.test(line)) continue;
        console.log(`    ${c.dim(line.slice(0, 160))}`);
      }
    };
    child.stdout.on("data", keep);
    child.stderr.on("data", keep);
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0 ? resolve() : reject(new Error(`${label ?? cmd} exited ${code}\n${lines.join("")}`)),
    );
  });
}

const payloadRun = (script, extraEnv) =>
  run("npx", ["payload", "run", script], { extraEnv, label: script });

// ── 3. Migrations ───────────────────────────────────────────────────────

say("Schema");
note("migrations are the only thing that changes this schema — dev push is off");

/**
 * Ask the database, rather than trusting the exit code.
 *
 * Against a brand-new database, `payload migrate` sometimes exits 0 having
 * applied nothing — reproduced twice here, on a database Postgres had just
 * created. Run it a second time and all eighty-one migrations apply normally,
 * so the first invocation appears to spend itself establishing the migrations
 * bookkeeping and then stop.
 *
 * Left alone, that surfaces three steps later as `relation "users" does not
 * exist` during a seed, which reads as a broken seed rather than a skipped
 * migration and sends you looking in the wrong file entirely.
 *
 * So the question asked is "is the schema there", not "did the command exit
 * 0". One retry, then a loud failure with the command to run by hand.
 */
async function schemaPresent() {
  const client = new pg.Client({ connectionString: env.DATABASE_URI, ssl });
  await client.connect();
  try {
    const { rows } = await client.query("select to_regclass('public.users') is not null as present");
    return rows[0].present === true;
  } finally {
    await client.end();
  }
}

for (let attempt = 1; ; attempt++) {
  try {
    await run("npx", ["payload", "migrate"], { label: "payload migrate" });
  } catch (e) {
    die(`Migrations failed.\n${e.message}`);
  }
  if (await schemaPresent()) break;
  if (attempt === 1) {
    note("migrate reported success but the schema is not there — retrying once");
    continue;
  }
  die(
    "Migrations ran without error and the schema is still missing.",
    `  Run it yourself and read the output:\n    npx payload migrate\n\n  If it says the database already has tables, it is not empty — point\n  DATABASE_URI at a new one, or drop and recreate this one.`,
  );
}
ok("schema is up to date");

// ── 4. Admin account ────────────────────────────────────────────────────

say("Admin account");

let adminEmail = (process.env.ADMIN_EMAIL ?? env.ADMIN_EMAIL ?? "").trim();
let adminPassword = process.env.ADMIN_PASSWORD ?? env.ADMIN_PASSWORD ?? "";

/** Is there already one? Then do not nag on a re-run. */
let hasAdmin = false;
{
  const client = new pg.Client({ connectionString: env.DATABASE_URI, ssl });
  await client.connect();
  try {
    const { rows } = await client.query("select count(*)::int as n from users where role = 'admin'");
    hasAdmin = rows[0].n > 0;
  } catch {
    hasAdmin = false;
  }
  await client.end();
}

if (hasAdmin && !adminEmail) {
  ok("an admin account already exists — skipping");
  note("forgotten the password? ADMIN_EMAIL=… ADMIN_PASSWORD=… npx payload run scripts/create-admin.ts");
} else {
  if (!adminEmail || !adminPassword) {
    if (!process.stdin.isTTY) {
      die(
        "No admin account, and nothing to make one from.",
        `  Re-run interactively, or supply them:\n    ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=… npm run setup`,
      );
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    note("this is the login for /admin — it is stored hashed, and only in your database");
    while (!adminEmail) adminEmail = (await rl.question("    email: ")).trim();
    while (adminPassword.length < 8) {
      adminPassword = await rl.question("    password (min 8 characters): ");
      if (adminPassword.length < 8) console.log(`    ${c.yellow("too short")}`);
    }
    rl.close();
  }
  try {
    await payloadRun("scripts/create-admin.ts", { ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword });
  } catch (e) {
    die(`Could not create the admin account.\n${e.message}`);
  }
  ok(`admin ready: ${adminEmail}`);
}

// ── 5. Content ──────────────────────────────────────────────────────────

/**
 * The order is the point, and it was arrived at by running it against a
 * genuinely empty database rather than by reading the files.
 *
 * Each step depends on one above it: entries reference brands; the landing
 * composition resolves people by SLUG, and those people are created by the
 * catalog import; the press log has to exist before it can be given an order.
 *
 * Two of these were missing from the first draft of this list and the failure
 * was not obvious — `deploy-landing.ts` stopped with "no page with slug '/'",
 * because `seed-pages.ts` writes the six NARRATIVE pages and `seed-surfaces.ts`
 * writes the five public ones. Similar names, different halves of the site.
 */
const SEEDS = [
  ["scripts/seed-brands.ts", "the brands the catalog is filed under", {}],
  ["scripts/import-entries.ts", "the catalog — 600 collections, taxonomy first", { PUBLISH_CLEAN: "1" }],
  /**
   * Three films the crawler dropped.
   *
   * The New Woo, Skin Deep and From Fat Lolli to 6 Pack Lolli reached
   * data/fampire/entries.json with nothing attached, for two reasons the
   * script itself documents — a subject-length rule that rejected "WOO" at
   * three letters, and a tier filter that silently skipped two folders. So
   * every fresh install rendered "No collections indexed yet" on three of the
   * eight films while production showed them correctly, because this had been
   * run there by hand and never added here.
   *
   * Idempotent on folderId: updates if present, creates if not.
   */
  ["scripts/import-missing-film-collections.ts", "three films the crawler missed", {}],
  ["scripts/seed-surfaces.ts", "the five public pages, as CMS records", {}],
  ["scripts/seed-content.ts", "film slate, family bios, navigation and footer", {}],
  ["scripts/import-editorial.ts", "film synopses and the press log", {}],
  ["scripts/seed-appearance-order.ts", "the order the press log reads in", {}],
  ["scripts/seed-watch.ts", "where each film can be watched", {}],
  ["scripts/seed-pages.ts", "the six narrative pages, kept as drafts", {}],
  ["scripts/deploy-landing.ts", "the approved landing composition", {}],
  ["scripts/seed-magazine-tree.ts", "magazines → cover star → issue → collections", {}],
  ["scripts/seed-person-aliases.ts", "the other spellings people actually type", {}],
];

say("Content");
note("every seed is idempotent — it upserts, so running setup again is safe");

async function runSeeds() {
  for (const [script, what, extra] of SEEDS) {
    console.log(`\n    ${c.bold("·")} ${what}  ${c.dim(script)}`);
    try {
      await payloadRun(script, extra);
      ok("done");
    } catch (e) {
      die(
        `${script} failed.\n${e.message}`,
        `  The database is left as it is. Fix the cause and run ${c.bold("npm run setup")} again —\n  the steps above this one will skip themselves.`,
      );
    }
  }
}

/**
 * Ask the database what landed, rather than trusting eleven exit codes.
 *
 * A seed has been observed writing nothing against a BRAND-NEW database while
 * printing its whole success report and exiting 0 — `seed-magazine-tree` said
 * "linked 28 collection(s)" and left `magazine_issues` empty. `payload migrate`
 * does the same thing on a fresh schema, which is why the schema step above
 * already checks instead of trusting. Two different steps, one behaviour: the
 * first operation against freshly created tables can quietly do nothing.
 *
 * Every seed is idempotent, so the repair is simply to run the list again.
 * A second pass on an already-correct database is a few seconds of no-ops.
 */
const EXPECTED = [
  ["brands", "select count(*)::int n from brands"],
  ["catalog entries", "select count(*)::int n from entries"],
  ["people", "select count(*)::int n from people"],
  ["films", "select count(*)::int n from films"],
  ["press appearances", "select count(*)::int n from appearances"],
  ["pages", "select count(*)::int n from pages"],
  ["magazine issues", "select count(*)::int n from magazine_issues"],
];

async function missing() {
  const client = new pg.Client({ connectionString: env.DATABASE_URI, ssl });
  await client.connect();
  const empty = [];
  try {
    for (const [label, sql] of EXPECTED) {
      try {
        const { rows } = await client.query(sql);
        if (!rows[0]?.n) empty.push(label);
      } catch {
        empty.push(label);
      }
    }
  } finally {
    await client.end();
  }
  return empty;
}

await runSeeds();

{
  const empty = await missing();
  if (empty.length) {
    console.log(`\n    ${c.yellow("·")} ${empty.join(", ")} came back empty — running the seeds once more`);
    note("every seed upserts, so a second pass is safe");
    await runSeeds();
    const still = await missing();
    if (still.length) {
      die(
        `These are still empty after two passes: ${still.join(", ")}.`,
        `  Run the seed for one of them by hand and read its output:\n    npx payload run scripts/seed-magazine-tree.ts`,
      );
    }
    ok("second pass filled them");
  }
}

// ── Done ────────────────────────────────────────────────────────────────

const site = env.SITE_URL || "http://localhost:3200";
console.log(`
${c.green("Ready.")}

    ${c.bold("npm run dev")}

  then
    ${site}         the press room
    ${site}/admin   the CMS — sign in with the account above

  Verify it at any time:
    ${c.bold("npm run verify")}     one command, every check
`);
