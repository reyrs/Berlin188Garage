// Vercel serverless function — served at /sitemap.xml (via the rewrite in
// vercel.json; the raw function URL under Vercel's zero-config /api
// convention is /api/sitemap.xml). Generated on each request (not at build
// time) so newly published blog posts show up immediately, no redeploy
// needed. See supabase/migrations for the blog_posts schema this queries
// (status='published', public via anon key, same as the public blog pages).
import { createClient } from '@supabase/supabase-js';

const SITE_URL = 'https://www.berlin188.com';

const STATIC_ROUTES = [
  { path: '/', priority: '1.0' },
  { path: '/blog', priority: '0.8' },
  { path: '/privasi', priority: '0.3' },
  { path: '/syarat', priority: '0.3' },
];

function xmlEscape(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default async function handler(req: any, res: any) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

  const urls: string[] = STATIC_ROUTES.map(
    r => `  <url>\n    <loc>${SITE_URL}${r.path}</loc>\n    <priority>${r.priority}</priority>\n  </url>`
  );

  if (supabaseUrl && supabaseAnonKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);
      const { data: posts, error } = await supabase
        .from('blog_posts')
        .select('slug, updated_at, published_at')
        .eq('status', 'published');
      if (error) throw error;
      for (const post of posts || []) {
        const lastmod = (post.updated_at || post.published_at || '').slice(0, 10);
        urls.push(
          `  <url>\n    <loc>${SITE_URL}/blog/${xmlEscape(post.slug)}</loc>${
            lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : ''
          }\n    <priority>0.6</priority>\n  </url>`
        );
      }
    } catch (err) {
      console.error('sitemap: failed to load blog posts', err);
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  res.status(200).send(xml);
}
