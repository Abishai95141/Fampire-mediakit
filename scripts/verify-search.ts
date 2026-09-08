/**
 * Proves the two search fixes, against the real catalog rather than fixtures.
 *
 *   npx tsx scripts/verify-search.ts
 *
 * Both claims are checked the same way: run the query the client actually
 * typed and compare it to the query they MEANT. A stopword should change
 * nothing; a tag should make an undescribed collection findable.
 */
import { readFileSync } from "node:fs";
import { applyFacets, setPersonAliases, suggestTerm, type Entry } from "../lib/fampire/catalog";

const raw = JSON.parse(readFileSync("data/fampire/entries.json", "utf8"));
const entries: Entry[] = Array.isArray(raw) ? raw : (raw.entries ?? raw.docs);
const hits = (q: string, pool: Entry[] = entries) => applyFacets(pool, { q } as never).length;

let failed = 0;
const check = (label: string, got: unknown, want: unknown) => {
  const ok = got === want;
  if (!ok) failed++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(46)} ${got}${ok ? "" : ` (expected ${want})`}`);
};

console.log(`\ncatalog: ${entries.length} entries\n`);

console.log("Stopwords — the client's three examples:");
const family = hits("Anthony family");
check("Anthony family                  (the baseline)", family > 0, true);
check("Anthony with family      == Anthony family", hits("Anthony with family"), family);
check("Anthony and family       == Anthony family", hits("Anthony and family"), family);
const lbj = hits("Legend Brian Johnson");
check("Legend with Brian Johnson == Legend Brian…", hits("Legend with Brian Johnson"), lbj);

console.log("\nStopwords must not widen a real query:");
const guru = hits("guru");
check("The Guru                 == guru", hits("The Guru"), guru);
check("a query of only stopwords still narrows", hits("the") < entries.length, true);
check("empty query returns everything", hits(""), entries.length);

console.log("\nTags now reach the index:");
const target = entries.find((e) => e.title)!;
const tagged = entries.map((e) =>
  e === target ? { ...e, tags: ["real estate", "rapid realty"] } : e,
);
check("real estate                 before tagging", hits("real estate"), 0);
check("real estate                  after tagging", hits("real estate", tagged), 1);
check("rapid realty                 after tagging", hits("rapid realty", tagged), 1);
check("an untagged term still finds nothing", hits("zzzq", tagged), 0);

console.log("\nAliases — the other spellings people type:");
// A real row to aim at, so the test is about matching and not about fixtures.
const subject = entries.find((e) => /bryan johnson/i.test(e.title))?.title ? "Bryan Johnson" : entries[0].title.split(" ")[0];
const canonicalHits = hits(subject);
check(`"${subject}" is findable at all`, canonicalHits > 0, true);

check("an unregistered misspelling finds nothing", hits("Bryyan Johnsonn"), 0);

setPersonAliases([{ alias: "Brian Johnson", canonical: subject }]);
check(`misspelling now finds what "${subject}" finds`, hits("Brian Johnson"), canonicalHits);
check("word boundaries hold — 'Brianna' is not 'Brian'", hits("Brianna Johnson"), 0);

/**
 * The narrowing trap: a one-word alias whose canonical is three words would,
 * under plain substitution, ADD two required terms and return less than the
 * query did before. The union is what stops that.
 */
const before = hits(subject);
setPersonAliases([{ alias: subject, canonical: "Some Much Longer Name" }]);
check("a longer canonical never loses results", hits(subject) >= before, true);

setPersonAliases([]);
check("clearing aliases restores plain search", hits("Brian Johnson"), 0);

console.log("\nDid-you-mean — misspellings nobody recorded:");
const suggest = (q: string) => suggestTerm(entries, q);

check("a single misspelt word still works", suggest("Ashtn"), "ashton");
check("a misspelt NAME works — the whole point", suggest("Ashtn Hall"), "ashton hall");
// A half-typed word needs no correction — the matcher accepts a prefix, so
// "Ashton Hal" already finds the same rows and a suggestion would be noise.
check("a half-typed word already works, so no suggestion", suggest("Ashton Hal"), null);
check("only the misspelt word is changed", suggest("Ashtn Halll"), "ashton hall");
check("a correct query is left alone", suggest("Ashton Hall"), null);
check("gibberish suggests nothing", suggest("qqqqzzz wwwwvvv"), null);
/**
 * The dead-end guard: "ashtn" corrects to "ashton", but "zzzzqqq" corrects to
 * nothing, so the phrase would return 0 — and a suggestion that also returns
 * nothing costs a click to learn the same thing twice.
 */
check("a suggestion that finds nothing is not offered", suggest("Ashtn zzzzqqq"), null);

console.log(failed ? `\n${failed} check(s) failed\n` : "\nall checks passed\n");
process.exit(failed ? 1 : 0);
