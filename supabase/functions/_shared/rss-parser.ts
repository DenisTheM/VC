/**
 * Shared RSS/Atom feed parser for Supabase Edge Functions.
 * Parses RSS 2.0 and Atom feeds, extracting normalized feed entries.
 */

export interface FeedEntry {
  guid: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string | null; // ISO 8601
}

/**
 * Fetch and parse an RSS or Atom feed from the given URL.
 * Returns an array of normalized FeedEntry objects.
 */
export async function parseFeed(
  feedUrl: string,
  feedType: "rss" | "atom" | "html",
): Promise<FeedEntry[]> {
  if (feedType === "html") {
    // HTML sources (like IRS) require scraping — not supported via RSS parser.
    // Return empty array; these sources need a dedicated scraper.
    return [];
  }

  const response = await fetch(feedUrl, {
    headers: { "User-Agent": "VirtueCompliance-FeedFetcher/1.0" },
  });

  if (!response.ok) {
    throw new Error(`Feed fetch failed: ${response.status} ${response.statusText} for ${feedUrl}`);
  }

  const xml = await response.text();

  if (feedType === "atom") {
    return parseAtom(xml);
  }

  return parseRss(xml);
}

/** Parse RSS 2.0 XML */
function parseRss(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const items = extractAllTags(xml, "item");

  for (const item of items) {
    const title = extractTagContent(item, "title");
    const link = extractTagContent(item, "link");
    const guid = extractTagContent(item, "guid") || link;
    const description = extractTagContent(item, "description");
    const pubDate = extractTagContent(item, "pubDate");

    if (!guid || !title) continue;

    entries.push({
      guid,
      title: decodeEntities(title),
      summary: decodeEntities(stripHtml(description || "")),
      link: link || "",
      publishedAt: pubDate ? tryParseDate(pubDate) : null,
    });
  }

  return entries;
}

/** Parse Atom XML */
function parseAtom(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const items = extractAllTags(xml, "entry");

  for (const item of items) {
    const title = extractTagContent(item, "title");
    const id = extractTagContent(item, "id");
    const link = extractAtomLink(item);
    const summary =
      extractTagContent(item, "summary") || extractTagContent(item, "content");
    const updated =
      extractTagContent(item, "updated") || extractTagContent(item, "published");

    const guid = id || link;
    if (!guid || !title) continue;

    entries.push({
      guid,
      title: decodeEntities(title),
      summary: decodeEntities(stripHtml(summary || "")),
      link: link || "",
      publishedAt: updated ? tryParseDate(updated) : null,
    });
  }

  return entries;
}

// ── XML Helpers ──────────────────────────────────────────────────────────────

/** Extract all occurrences of a tag as raw strings */
function extractAllTags(xml: string, tag: string): string[] {
  const results: string[] = [];
  const openTag = `<${tag}`;
  const closeTag = `</${tag}>`;
  let pos = 0;

  while (true) {
    const start = xml.indexOf(openTag, pos);
    if (start === -1) break;

    const end = xml.indexOf(closeTag, start);
    if (end === -1) break;

    results.push(xml.slice(start, end + closeTag.length));
    pos = end + closeTag.length;
  }

  return results;
}

/** Extract the text content of the first occurrence of a tag */
function extractTagContent(xml: string, tag: string): string | null {
  // Handle CDATA sections
  const cdataPattern = new RegExp(
    `<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`,
    "i",
  );
  const cdataMatch = xml.match(cdataPattern);
  if (cdataMatch) return cdataMatch[1].trim();

  // Handle regular content
  const pattern = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

/** Extract href from Atom <link> elements */
function extractAtomLink(xml: string): string {
  // Prefer rel="alternate" or no rel
  const altMatch = xml.match(
    /<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i,
  );
  if (altMatch) return altMatch[1];

  const hrefMatch = xml.match(/<link[^>]*href=["']([^"']+)["']/i);
  return hrefMatch ? hrefMatch[1] : "";
}

/** Strip HTML tags from a string */
function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/** Decode common HTML entities */
function decodeEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/** Try to parse a date string to ISO format, return null if invalid */
function tryParseDate(dateStr: string): string | null {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}
