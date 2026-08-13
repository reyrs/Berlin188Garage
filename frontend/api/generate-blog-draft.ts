// Vercel Cron target — runs on a schedule (see vercel.json "crons"), not
// meant to be hit directly: guarded by CRON_SECRET, which Vercel attaches
// automatically as `Authorization: Bearer <CRON_SECRET>` on scheduled
// invocations (see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs).
//
// Flow: pull the same detikOto feed as api/otomotif-news.ts, filter to
// European-brand headlines, skip any already turned into a draft
// (blog_posts.source_url), ask Gemini to write a short original post
// referencing the headline, and insert it as a DRAFT — a human still has
// to review and publish from the dashboard, this never goes live on its
// own. Service-role key is required because there's no staff auth
// session in a cron context (RLS would otherwise block both the dedup
// read of draft rows and the insert).
import { createClient } from '@supabase/supabase-js';

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
const FALLBACK_IMAGE = 'https://www.berlin188.com/logo.png';

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

function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  const suffix = crypto.randomUUID().slice(0, 6);
  return `${base}-${suffix}`;
}

async function fetchCandidateNews() {
  const resp = await fetch(FEED_URL, { headers: { 'User-Agent': 'Berlin188Garage/1.0' } });
  if (!resp.ok) throw new Error(`feed responded ${resp.status}`);
  const xml = await resp.text();
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items
    .map(block => {
      const title = extractTag(block, 'title');
      const link = extractTag(block, 'link');
      const imageMatch = block.match(/<enclosure[^>]*url="([^"]*)"/);
      return { title, link, image: imageMatch ? decodeEntities(imageMatch[1]) : null };
    })
    .filter(item => item.title && item.link && BRAND_PATTERNS.some(re => re.test(item.title)));
}

async function writeDraft(headline: string, sourceUrl: string, apiKey: string) {
  const prompt = `Kamu menulis untuk blog Berlin 188 Garage, bengkel spesialis mobil Eropa (Mercedes-Benz, BMW, Audi, VW, MINI, Land Rover) di Tangerang Selatan.

Ada berita otomotif ini: "${headline}" (sumber: detikOto, ${sourceUrl})

Tulis artikel blog PENDEK dan ORIGINAL yang membahas relevansi berita ini buat pemilik mobil Eropa di Indonesia — JANGAN menyalin ulang isi berita, tulis komentar/analisis singkat dari sudut pandang bengkel spesialis. Kalau beritanya bukan hal yang benar-benar relevan buat perawatan/kepemilikan mobil Eropa, tetap boleh dibahas ringan tapi jangan mengada-ada.

ATURAN PENTING:
- JANGAN kasih instruksi teknis perbaikan spesifik atau klaim yang gak didukung berita aslinya — ini cuma artikel opini/awareness, bukan panduan servis
- Akhiri dengan ajakan halus buat konsultasi ke Berlin 188 kalau pembaca butuh cek kondisi mobilnya
- Sertakan satu kalimat penutup yang menyebut sumber beritanya (detikOto) secara natural
- Gaya bahasa: santai tapi informatif, Bahasa Indonesia, 3-4 paragraf pendek
- "content" HARUS berupa HTML sederhana, paragraf dibungkus <p>...</p>, tanpa markdown

Balas dengan JSON: { "title": "...", "excerpt": "1-2 kalimat ringkasan buat preview card", "content": "<p>...</p><p>...</p>" }`;

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING' },
              excerpt: { type: 'STRING' },
              content: { type: 'STRING' },
            },
            required: ['title', 'excerpt', 'content'],
          },
        },
      }),
    }
  );
  if (!geminiRes.ok) throw new Error(`Gemini responded ${geminiRes.status}: ${await geminiRes.text()}`);
  const data = await geminiRes.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  return JSON.parse(text) as { title: string; excerpt: string; content: string };
}

export default async function handler(req: any, res: any) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && req.headers?.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!supabaseUrl || !serviceRoleKey || !geminiKey) {
    res.status(500).json({ error: 'missing required env vars' });
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const [candidates, { data: usedRows, error: usedError }] = await Promise.all([
      fetchCandidateNews(),
      supabase.from('blog_posts').select('source_url').not('source_url', 'is', null),
    ]);
    if (usedError) throw usedError;

    const usedUrls = new Set((usedRows || []).map(r => r.source_url));
    const pick = candidates.find(item => !usedUrls.has(item.link));

    if (!pick) {
      res.status(200).json({ skipped: true, reason: 'no unused European-brand headline right now' });
      return;
    }

    const draft = await writeDraft(pick.title, pick.link, geminiKey);
    const slug = slugify(draft.title);

    const { error: insertError } = await supabase.from('blog_posts').insert({
      title: draft.title,
      slug,
      excerpt: draft.excerpt,
      content: draft.content,
      cover_image_url: pick.image || FALLBACK_IMAGE,
      category: 'Berita Bengkel',
      status: 'draft',
      created_by: 'AI (auto-draft)',
      source_url: pick.link,
    });
    if (insertError) throw insertError;

    res.status(200).json({ created: true, slug, sourceHeadline: pick.title });
  } catch (err) {
    console.error('generate-blog-draft: failed', err);
    res.status(500).json({ error: String(err) });
  }
}
