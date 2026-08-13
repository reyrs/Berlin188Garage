// Vercel serverless function — served at /api/otomotif-news. Pulls the
// public detikOto RSS feed and returns only headlines that mention a
// European brand Berlin 188 actually services, so the landing page can
// show "industry trend" news without reproducing full article bodies
// (title + source + outbound link only — same pattern as Google News,
// not a copyright issue). Cached for an hour; if the feed is unreachable
// or nothing matches today, returns an empty array and the frontend just
// hides the section.
const FEED_URL = 'https://oto.detik.com/rss';
const BRAND_PATTERNS = [
  /\bmercedes(-benz)?\b/i,
  /\bbmw\b/i,
  /\baudi\b/i,
  /\bvolkswagen\b/i,
  /\bvw\b/i,
  /\bmini\b/i,
  /\bland rover\b/i,
  /\brange rover\b/i,
];

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'");
}

function stripCdata(value: string): string {
  return decodeEntities(value.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim());
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match ? stripCdata(match[1]) : '';
}

export default async function handler(req: any, res: any) {
  try {
    const resp = await fetch(FEED_URL, { headers: { 'User-Agent': 'Berlin188Garage/1.0' } });
    if (!resp.ok) throw new Error(`feed responded ${resp.status}`);
    const xml = await resp.text();

    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const news = items
      .map(block => {
        const title = extractTag(block, 'title');
        const link = extractTag(block, 'link');
        const pubDate = extractTag(block, 'pubDate');
        const imageMatch = block.match(/<enclosure[^>]*url="([^"]*)"/);
        return { title, link, pubDate, image: imageMatch ? decodeEntities(imageMatch[1]) : null };
      })
      .filter(item => item.title && item.link && BRAND_PATTERNS.some(re => re.test(item.title)))
      .slice(0, 4);

    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.status(200).json({ source: 'detikOto', items: news });
  } catch (err) {
    console.error('otomotif-news: failed to load feed', err);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json({ source: 'detikOto', items: [] });
  }
}
