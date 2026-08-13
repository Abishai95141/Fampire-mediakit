import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import EditBar from "@/components/fampire/EditBar";
import EntryCard from "@/components/fampire/EntryCard";
import Section from "@/components/fampire/Section";
import { isSignedIn } from "@/lib/fampire/auth";
import { KIND_LABEL_FALLBACK, PLATFORM_LABEL } from "@/lib/fampire/catalog";
import { getCollection, previewImage, relatedCollections } from "@/lib/fampire/collection";

/**
 * One collection — the shareable page.
 *
 * Before this existed the Library linked straight out to Drive, so no entry
 * had a URL of its own. That quietly failed the §8 criterion that a link
 * unfurls with title, description and image in iMessage, WhatsApp, Slack,
 * LinkedIn and Gmail: you cannot unfurl a link you do not have. A press
 * contact can now be sent one address that explains what the material is
 * before they click into someone else's storage.
 *
 * It does NOT try to browse the folder. §4.5 rule 5 — stop at the collection,
 * link into Drive and let it handle the leaf. Drive already does browse,
 * preview and in-folder search better than we would, and rebuilding that is
 * how a catalog turns into the digital asset manager the client rejected.
 */

export const dynamic = "force-dynamic";

type Args = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { slug } = await params;
  const entry = await getCollection(slug);
  if (!entry) return { title: "Not found" };

  const image = previewImage(entry);

  return {
    title: entry.title,
    description: entry.description,
    alternates: { canonical: `/collections/${slug}` },
    openGraph: {
      type: "article",
      title: entry.title,
      description: entry.description,
      // Server-rendered, which is the whole reason unfurling works — a crawler
      // does not run our JavaScript.
      images: image ? [{ url: image, width: 1200, alt: entry.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: entry.title,
      description: entry.description,
      images: image ? [image] : undefined,
    },
  };
}

const nf = (n?: number) => Number(n ?? 0).toLocaleString("en-US");

export default async function CollectionPage({ params }: Args) {
  const { slug } = await params;

  const signedIn = await isSignedIn();
  const entry = await getCollection(slug, signedIn);
  // A held-back collection 404s rather than 403s, so the page never confirms
  // that a private entry exists.
  if (!entry) notFound();

  const related = await relatedCollections(entry);
  const image = previewImage(entry, 1600);

  const facts: [string, string][] = [
    ["Type", KIND_LABEL_FALLBACK[entry.kind] ?? entry.kind],
    ...(entry.occasion ? ([["Occasion", entry.occasion.replace(/-/g, " ")]] as [string, string][]) : []),
    ...(entry.film ? ([["Film", entry.film]] as [string, string][]) : []),
    ...(entry.event ? ([["Event", entry.event]] as [string, string][]) : []),
    ...(entry.location ? ([["Location", entry.location]] as [string, string][]) : []),
    ...(entry.year ? ([["Year", String(entry.year)]] as [string, string][]) : []),
    ...(entry.orientation ? ([["Orientation", entry.orientation]] as [string, string][]) : []),
    ["Items", nf(entry.file_count)],
    ["Source", PLATFORM_LABEL[entry.source_platform] ?? entry.source_platform],
  ];

  return (
    <>
      {/* Renders nothing for a signed-out reader — a press contact must never
          see editorial furniture on a public surface. */}
      <EditBar collection="entries" id={entry.id} label={entry.title} />
    <main className="mx-auto max-w-4xl px-6 py-16">
      <nav className="text-xs uppercase tracking-[0.2em] opacity-60">
        <Link href={`/library`} className="hover:opacity-100">
          The Library
        </Link>
        <span aria-hidden> · </span>
        <span>{KIND_LABEL_FALLBACK[entry.kind] ?? entry.kind}</span>
      </nav>

      <h1 className="mt-4 text-4xl font-semibold leading-tight">{entry.title}</h1>
      <p className="mt-4 max-w-2xl text-lg opacity-80">{entry.description}</p>

      {image ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={image}
          alt={entry.title}
          className="mt-8 w-full rounded-lg object-cover"
          loading="lazy"
        />
      ) : null}

      {/* Child safety is surfaced, not hidden. An editor deciding whether to
          use this material needs to know before they open the folder (§9.1). */}
      {entry.contains_minor ? (
        <p className="mt-6 rounded border px-4 py-3 text-sm">
          This collection features a child. Usage is subject to the family&rsquo;s written
          permission.
        </p>
      ) : null}

      <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3">
        {facts.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-widest opacity-60">{k}</dt>
            <dd className="mt-1 capitalize">{v}</dd>
          </div>
        ))}
      </dl>

      {/* Three separate claims, kept separate. "Featuring" says who is in the
          frame; the archive often only records who shot it or who owns it, and
          collapsing those into one line credited the BTS cinematographer as a
          subject on 110 collections. */}
      <div className="mt-8 flex flex-col gap-2 text-sm opacity-80">
        {entry.subjects.length || entry.people?.length ? (
          <p>
            <span className="uppercase tracking-widest opacity-60">Featuring </span>
            {[...entry.subjects, ...(entry.people ?? [])].join(" · ")}
          </p>
        ) : null}
        {entry.crew?.length ? (
          <p>
            <span className="uppercase tracking-widest opacity-60">Shot or cut by </span>
            {entry.crew.join(" · ")}
          </p>
        ) : null}
        {entry.rights_holders?.length ? (
          <p>
            <span className="uppercase tracking-widest opacity-60">Courtesy of </span>
            {entry.rights_holders.join(" · ")}
          </p>
        ) : null}
      </div>

      <div className="mt-10 flex flex-wrap items-center gap-4">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border px-5 py-3 font-medium"
        >
          Open in {PLATFORM_LABEL[entry.source_platform] ?? "storage"}
        </a>
        {entry.access === "password" ? (
          <span className="text-sm opacity-70">
            Password protected — contact the media team for access.
          </span>
        ) : null}
        {entry.status === "gone" || entry.access === "broken" ? (
          <span className="text-sm opacity-70">
            This link was unreachable at the last check.
          </span>
        ) : null}
      </div>

      {/* The alternates exist because 324 subjects were stored in more than
          one folder; the duplicates collapsed into this entry (§7.6). */}
      {entry.alternates.length ? (
        <p className="mt-4 text-sm opacity-70">
          Also stored in{" "}
          {entry.alternates.map((u, i) => (
            <span key={u}>
              {i ? ", " : ""}
              <a href={u} target="_blank" rel="noopener noreferrer" className="underline">
                another folder
              </a>
            </span>
          ))}
          .
        </p>
      ) : null}

      {related.length ? (
        <div className="mt-20">
          <Section n="01" title="Related collections">
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((e) => (
                <li key={e.id}>
                  <EntryCard entry={e} signedIn={signedIn} />
                </li>
              ))}
            </ul>
          </Section>
        </div>
      ) : null}
    </main>
    </>
  );
}
