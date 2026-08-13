import config from "@payload-config";
import { getPayload } from "payload";

/**
 * Seed the worlds that live in THIS application.
 *
 * HNN is deliberately absent. It is a separate product — its own repository,
 * its own database, its own CMS, its own login — and modelling it as a brand
 * record here produced a card that looked like part of this site and then
 * redirected somewhere else, which is exactly the confusion this removes.
 * The two applications are brought up side by side by `npm run dev:all`; they
 * share nothing at runtime.
 *
 * Build plan §2.2: all eight brand records exist from commit one, including
 * the ones with no assets yet. Empty brands cost nothing; retrofitting tenancy
 * onto live data means touching every table and query.
 *
 * FAMPIRE is not in this list either: FAMPIRE is this whole site, the press
 * room itself, not one of the worlds inside it.
 *
 * Idempotent: matches on slug, updates in place, so it is safe to re-run after
 * editing the table below.
 *
 * Run: npx payload run scripts/seed-brands.ts
 */

type Seed = {
  slug: string;
  name: string;
  tagline?: string;
  hasAssets: boolean;
  external?: boolean;
  externalHref?: string;
};

/**
 * `hasAssets` is set from what is actually in the catalog today, not from an
 * expectation. Three worlds carry entries (biohack-yourself 58,
 * lolli-brands 34, lolli-holdings 2); HNN carries its own library inside its
 * own app. The rest are real brands with nothing supplied yet.
 */
const BRANDS: Seed[] = [
  {
    slug: "biohack-yourself",
    name: "Biohack Yourself",
    tagline: "The flagship documentary strand and its live events.",
    hasAssets: true,
  },
  {
    slug: "lolli-brands",
    name: "Lolli Brands Entertainment",
    tagline: "The production house behind the slate.",
    hasAssets: true,
  },
  {
    slug: "lolli-holdings",
    name: "Lolli Holdings",
    tagline: "The holding company.",
    hasAssets: true,
  },
  { slug: "zanzi", name: "Zanzi", hasAssets: false },
  { slug: "wynx", name: "WYNX", hasAssets: false },
  { slug: "lolli-family-office", name: "Lolli Family Office", hasAssets: false },
  { slug: "lolli-lifestyle", name: "Lolli Lifestyle", hasAssets: false },
];

const payload = await getPayload({ config });

for (const brand of BRANDS) {
  const existing = await payload.find({
    collection: "brands",
    where: { slug: { equals: brand.slug } },
    limit: 1,
  });

  if (existing.docs.length) {
    await payload.update({
      collection: "brands",
      id: existing.docs[0]!.id,
      data: brand,
    });
    console.log(`updated  ${brand.slug}`);
  } else {
    await payload.create({ collection: "brands", data: brand });
    console.log(`created  ${brand.slug}`);
  }
}

const total = await payload.count({ collection: "brands" });
console.log(`\n${total.totalDocs} brands in the institution.`);

process.exit(0);
