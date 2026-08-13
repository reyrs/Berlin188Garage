// Vercel Edge Middleware — only intercepts requests to /blog/:slug from
// known social-preview bots (WhatsApp, Facebook, Twitter/X, Telegram,
// LinkedIn, Slack, Discord). Those bots never execute JS, so they only ever
// see index.html's generic static <meta> tags — this serves them a minimal
// HTML page with the actual post's title/excerpt/cover image instead.
// Real visitors (no bot user-agent match) are untouched: the request falls
// through to the normal SPA, same as before.
const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|Slackbot|TelegramBot|LinkedInBot|Discordbot|WhatsApp|vkShare|redditbot|SkypeUriPreview|Pinterest/i;

const SITE_URL = 'https://www.berlin188.com';
const FALLBACK_IMAGE = `${SITE_URL}/logo.png`;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export const config = {
  matcher: '/blog/:slug',
};

export default async function middleware(request: Request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (!BOT_UA.test(userAgent)) return; // real visitor — let the SPA handle it

  const url = new URL(request.url);
  const slug = url.pathname.replace('/blog/', '');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !slug) return;

  try {
    const restUrl = `${supabaseUrl}/rest/v1/blog_posts?slug=eq.${encodeURIComponent(slug)}&status=eq.published&select=title,excerpt,cover_image_url`;
    const resp = await fetch(restUrl, {
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
    });
    if (!resp.ok) return;
    const rows = await resp.json();
    const post = rows?.[0];
    if (!post) return; // unknown slug — fall through to the SPA's own 404 handling

    const title = escapeHtml(post.title);
    const description = escapeHtml(post.excerpt || '');
    const image = post.cover_image_url || FALLBACK_IMAGE;
    const postUrl = `${SITE_URL}/blog/${slug}`;

    const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<title>${title} — Berlin 188 Garage</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${postUrl}" />
<meta property="og:type" content="article" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:image" content="${image}" />
<meta property="og:url" content="${postUrl}" />
<meta property="og:locale" content="id_ID" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${image}" />
</head>
<body>
<h1>${title}</h1>
<p>${description}</p>
</body>
</html>`;

    return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
  } catch (err) {
    console.error('middleware: failed to build bot preview', err);
    return; // fail open — real SPA still loads
  }
}
