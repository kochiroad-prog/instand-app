import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Supabase server-side client ───────────────────────────────
const getSupabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// ── Kategori label untuk konteks AI ──────────────────────────
const CAT_LABEL = {
  booth_base: 'Booth Dasar',
  addon:      'Add-on / Aksesori',
  ongkir:     'Ongkos Kirim',
  material:   'Bahan / Material',
};

export async function POST(request) {
  try {
    const { imageBase64, products, description } = await request.json();

    // ── Ambil AI Knowledge Base dari Supabase ────────────────
    let knowledgeContext = '';
    try {
      const supabase = getSupabase();
      const { data: knowledge } = await supabase
        .from('ai_knowledge_base')
        .select('title, content, category')
        .eq('is_active', true)
        .order('category');
      if (knowledge?.length) {
        knowledgeContext = '\n\n=== KNOWLEDGE BASE INSTAND ===\n' +
          knowledge.map(k => `## ${k.title}\n${k.content}`).join('\n\n');
      }
    } catch { /* knowledge base optional */ }

    if (!imageBase64) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY belum diset di environment' }, { status: 500 });
    }

    // ── Bangun katalog produk sebagai konteks ────────────────
    const byCategory = {};
    (products || []).forEach(p => {
      const cat = CAT_LABEL[p.category] || p.category;
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push(`  • ${p.name}${p.keterangan ? ' ('+p.keterangan+')' : ''} — Rp ${Number(p.unit_price).toLocaleString('id-ID')} per ${p.unit || 'pcs'} [id:${p.id}]`);
    });
    const catalog = Object.entries(byCategory)
      .map(([cat, items]) => `### ${cat}\n${items.join('\n')}`)
      .join('\n\n');

    // Knowledge base WAJIB dibaca dulu sebelum analisa
    const kbSection = knowledgeContext
      ? `\n\n=== KNOWLEDGE BASE WAJIB DIBACA ===\n${knowledgeContext.replace('=== KNOWLEDGE BASE INSTAND ===\n','')}\n=== END KNOWLEDGE BASE ===`
      : '';

    const systemPrompt = `Kamu adalah AI estimator harga INSTAND — perusahaan booth portable profesional di Malang.
${kbSection}

=== LANGKAH ANALISA (ikuti urutan ini) ===
LANGKAH 1 — Baca Knowledge Base di atas dengan seksama, terutama bagian pricelist, contoh rincian, dan pola kombinasi item.
LANGKAH 2 — Analisa gambar: identifikasi tipe booth, ukuran (perkiraan panjang x lebar), material, dan semua komponen yang terlihat.
LANGKAH 3 — Cocokkan setiap komponen yang terlihat dengan produk di KATALOG di bawah. Gunakan nama produk PERSIS dari katalog.
LANGKAH 4 — Jika ada payung/parasol terlihat → cari "Payung" di katalog. Jika ada roda → cari "Roda". Jika ada neon/lightbox → cari "Neonbox" atau "Lightbox". Jangan skip komponen yang terlihat jelas.
LANGKAH 5 — Pastikan ada minimal 1 item booth_base kecuali jika gambar hanya menampilkan aksesori.

=== KATALOG PRODUK TERSEDIA ===
${catalog}

=== ATURAN OUTPUT ===
- HANYA gunakan produk dari katalog di atas (gunakan id yang tertera)
- Validasi harga dengan knowledge base pricelist
- Jika gambar menunjukkan komponen spesifik, WAJIB masukkan ke items
- qty logis: payung 1 pcs, wingside bisa 2-3 pcs, kelistrikan sesuai jumlah lampu

BALAS HANYA FORMAT JSON INI (tanpa teks lain):
{
  "analisis": "Deskripsi booth: tipe, ukuran perkiraan, material terlihat, fitur utama",
  "confidence": "tinggi|sedang|rendah",
  "items": [
    {
      "product_id": "id dari katalog",
      "product_name": "nama produk PERSIS dari katalog",
      "qty": 1,
      "unit_price": 0,
      "unit": "pcs",
      "alasan": "komponen ini terlihat di gambar karena..."
    }
  ],
  "catatan": "asumsi yang dibuat, komponen yang tidak terlihat jelas tapi kemungkinan ada"
}`;

    // ── Panggil OpenRouter ───────────────────────────────────
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://instand-sales.vercel.app',
        'X-Title': 'INSTAND AI Estimator',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3-haiku',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: imageBase64 },
              },
              {
                type: 'text',
                text: systemPrompt + (description?.trim()
                  ? '\n\nINFO TAMBAHAN DARI SALES:\n' + description.trim()
                  : ''),
              },
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('[estimate-booth] OpenRouter error:', errText);
      // Deteksi kredit habis (402) atau billing error
      let errType = 'api_error';
      try {
        const errJson = JSON.parse(errText);
        if (orRes.status === 402 || errJson?.error?.code === 402 ||
            errText.includes('credit') || errText.includes('billing') ||
            errText.includes('insufficient') || errText.includes('balance')) {
          errType = 'insufficient_credits';
        }
      } catch {}
      return NextResponse.json(
        { error: 'OpenRouter API error: ' + orRes.status, detail: errText, errType },
        { status: 500 }
      );
    }

    const orData   = await orRes.json();
    const content  = orData.choices?.[0]?.message?.content || '';
    // Ambil usage data untuk kalkulasi biaya aktual
    const usage    = orData.usage || {};

    // ── Parse JSON dari respons ──────────────────────────────
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Respons AI tidak dapat diparsing', raw: content }, { status: 500 });
    }

    let result;
    try {
      result = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ error: 'JSON tidak valid dari AI', raw: content }, { status: 500 });
    }

    // ── Inject unit_price dari produk asli jika ada ──────────
    if (result.items && products) {
      const prodMap = Object.fromEntries(products.map(p => [p.id, p]));
      result.items = result.items.map(item => {
        const prod = prodMap[item.product_id];
        if (prod) {
          return {
            ...item,
            unit_price: prod.unit_price,
            unit: prod.unit || 'pcs',
            product_name: prod.name,
          };
        }
        return item;
      });
    }

    return NextResponse.json({ ...result, usage });
  } catch (err) {
    console.error('[estimate-booth] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
