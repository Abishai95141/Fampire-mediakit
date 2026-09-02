import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Switch the landing page onto the rest of the approved layouts.
 *
 *  - People becomes the roster (names and roles, portrait beside), which suits
 *    a family where one person is founder AND director AND author.
 *  - The intent lanes become the numbered progression, picture beside each.
 *  - Two split statements are added, using FAMPIRE's OWN lines. The template's
 *    equivalents ("You're not invisible", "Be remembered / discovered /
 *    trusted / invited") are a sales argument aimed at buying a course; these
 *    are sentences the family actually says on camera.
 *
 *   DRY_RUN=1 npx payload run scripts/apply-zeen-layouts.ts
 */

const DRY = process.env.DRY_RUN === "1";
const payload = await getPayload({ config });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const api = payload as any;
const admin = (
  await api.find({ collection: "users", where: { role: { equals: "admin" } }, limit: 1, depth: 0, overrideAccess: true })
).docs[0];

const page = (
  await api.find({ collection: "pages", where: { slug: { equals: "/" } }, limit: 1, depth: 0, overrideAccess: true, draft: true })
).docs[0];
if (!page) throw new Error("no page with slug '/'");

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cur = (page.layout ?? []) as any[];

/**
 * The problem statement, on the dark band, pictures behind the words.
 *
 * Straight from the script: the gap the institution exists to name.
 */
const splitProblem = {
  blockType: "statementSplit",
  lines: [{ text: "You are not invisible." }, { text: "You are simply unmeasured." }],
  overlap: true,
  dark: false,
  portraits: [],
  notes: [
    { text: "Every family office tracks every entity it owns. Every asset, every policy, every heir." },
    { text: "And not one of them measures the health of the two people the whole structure was built around." },
  ],
};

/** The closing verbs, centred, portraits pushed to the sides. */
const splitClose = {
  blockType: "statementSplit",
  lines: [
    { text: "Wealth is passed." },
    { text: "Health is not." },
    { text: "So we filmed it." },
    { text: "And gave it away." },
  ],
  overlap: false,
  dark: true,
  portraits: [],
  notes: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const next: any[] = [];
for (const b of cur) {
  if (b.blockType === "peopleRow") {
    next.push({ ...b, layout: "roster" });
    continue;
  }
  if (b.blockType === "lanes") {
    next.push({ ...b, layout: "phases" });
    continue;
  }
  // The problem statement lands immediately after the institution paragraph,
  // where the template puts its equivalent.
  if (b.blockType === "statement") {
    next.push(b, splitProblem);
    continue;
  }
  next.push(b);
}
// The close sits last, after "where to watch" — the final word on the page.
next.push(splitClose);

console.log("new order:");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
next.forEach((b: any, i) =>
  console.log(
    `  ${String(i + 1).padStart(2)}. ${b.blockType}${b.layout ? `  [${b.layout}]` : ""}${
      b.blockType === "statementSplit" ? `  "${b.lines[0].text}"` : ""
    }`,
  ),
);

if (!DRY) {
  await api.update({
    collection: "pages",
    id: page.id,
    data: { layout: next },
    depth: 0,
    overrideAccess: true,
    user: admin,
  });
  console.log("\npage '/' updated");
} else {
  console.log("\n[DRY RUN] nothing written");
}
process.exit(0);
