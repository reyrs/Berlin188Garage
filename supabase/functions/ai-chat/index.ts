// Supabase Edge Function — proxies the Gemini call so the API key never reaches the browser.
// Deploy: npx supabase functions deploy ai-chat --no-verify-jwt
// Secret:  npx supabase secrets set GEMINI_API_KEY=...

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface Product {
  id: string;
  code: string;
  name: string;
  brand: string;
  category: string;
  compatibility: string;
  price: number;
  stock: number;
}

function buildProductContext(products: Product[]) {
  return products
    .map((p) => `[${p.code}] ${p.name} | ${p.brand} | ${p.category} | ${p.compatibility} | Rp ${p.price.toLocaleString('id-ID')} | Stok: ${p.stock}`)
    .join('\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const { query, products, catalogSummary } = await req.json();

    if (!query || !Array.isArray(products)) {
      return new Response(JSON.stringify({ text: 'Pertanyaan tidak valid.', productIds: [] }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      return new Response(JSON.stringify({ text: 'AI tidak tersedia — Gemini API key belum dikonfigurasi di server.', productIds: [] }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Kamu adalah asisten AI untuk Berlin 188 Garage, toko sparepart mobil Eropa (Audi & Mercedes) di Indonesia.

${catalogSummary || ''}

Berikut ${products.length} produk yang paling relevan dengan pertanyaan customer:
${buildProductContext(products)}

Customer bertanya: "${query}"

PENTING — bedakan dua jenis pertanyaan customer:

A) Customer menyebutkan NAMA PART SPESIFIK yang mereka cari (misal "kampas rem", "shockbreaker", "filter oli", "aki") →
   1. Rekomendasikan 1-3 produk PALING sesuai dari daftar di atas
   2. Jelaskan kenapa produk tersebut cocok — sebutkan nama, harga, dan kategori
   3. Jangan merekomendasikan produk yang tidak ada di daftar
   4. "butuh_pemeriksaan" = false

B) Customer menceritakan GEJALA/KELUHAN kerusakan, bukan nama part (misal "mesin bunyi kasar", "mobil boros bensin", "AC kurang dingin", "ada getaran aneh", "mobil susah starter") →
   1. JANGAN menebak atau merekomendasikan part apa pun — kamu tidak melihat kondisi mobilnya langsung, menebak part bisa salah dan berbahaya (terutama untuk hal yang menyangkut keselamatan seperti rem/kelistrikan)
   2. Jelaskan singkat bahwa gejala itu perlu diperiksa langsung oleh mekanik supaya diagnosanya akurat
   3. Arahkan customer untuk menghubungi Berlin 188 via WhatsApp untuk atur jadwal pengecekan
   4. "produk" WAJIB array kosong []
   5. "butuh_pemeriksaan" = true

Style: friendly, singkat, bahasa Indonesia casual, sesekali pakai emoji.

Balas dengan JSON: { "jawaban": "teks jawaban...", "produk": ["P001", "P003"], "butuh_pemeriksaan": false } — "produk" maksimal 3 kode produk.`;

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
                jawaban: { type: 'STRING' },
                produk: { type: 'ARRAY', items: { type: 'STRING' } },
                butuh_pemeriksaan: { type: 'BOOLEAN' },
              },
              required: ['jawaban', 'produk', 'butuh_pemeriksaan'],
            },
          },
        }),
      }
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error('Gemini API error:', geminiRes.status, errText);
      return new Response(JSON.stringify({ text: 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti atau hubungi kami via WhatsApp ya.', productIds: [] }), {
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const data = await geminiRes.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    const parsed = JSON.parse(text);

    return new Response(
      JSON.stringify({
        text: parsed.jawaban || 'Maaf, saya tidak bisa memberikan rekomendasi saat ini.',
        productIds: Array.isArray(parsed.produk) ? parsed.produk : [],
        needsInspection: Boolean(parsed.butuh_pemeriksaan),
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('ai-chat function error:', err);
    return new Response(JSON.stringify({ text: 'Maaf, terjadi kesalahan saat menghubungi AI. Coba lagi nanti atau hubungi kami via WhatsApp ya.', productIds: [] }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
