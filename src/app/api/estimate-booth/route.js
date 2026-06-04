import { NextResponse } from 'next/server';

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

    if (!imageBase64) {
      return NextResponse.json({ error: 'Gambar tidak ditemukan' }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY belum diset di environment' }, { status: 500 });
    }

    // ── Bangun katalog produk sebagai konteks ────────────────
    const catalog = (products || []).map(p =>
      `[${CAT_LABEL[p.category] || p.category}] ${p.name}${p.keterangan ? ' ('+p.keterangan+')' : ''} — Rp ${Number(p.unit_price).toLocaleString('id-ID')} per ${p.unit || 'pcs'} | id:${p.id}`
    ).join('\n');

    const systemPrompt = `Kamu adalah AI estimator harga untuk INSTAND, perusahaan yang membuat booth portable profesional.

KATALOG PRODUK YANG TERSEDIA:
${catalog}

TUGAS:
Analisa gambar booth portable yang diberikan. Identifikasi komponen-komponen yang terlihat atau kemungkinan digunakan, lalu cocokkan dengan katalog di atas untuk membuat estimasi biaya produksi (HPP).

ATURAN PENTING:
- Pilih HANYA produk yang ada di katalog di atas. Jangan mengarang produk baru.
- Gunakan field "id" dari katalog untuk field product_id di output.
- Estimasi qty secara logis berdasarkan ukuran booth yang terlihat.
- Jika ada beberapa pilihan, pilih yang paling sesuai secara visual.
- Jika booth terlihat besar, estimasi qty lebih banyak.
- Fokus ke booth_base dulu, lalu add-on, lalu ongkir jika terlihat.

BALAS HANYA DALAM FORMAT JSON INI (tanpa teks lain di luar JSON):
{
  "analisis": "Deskripsi singkat booth: tipe, ukuran perkiraan, material yang terlihat, fitur utama",
  "confidence": "tinggi|sedang|rendah",
  "items": [
    {
      "product_id": "id dari katalog",
      "product_name": "nama produk dari katalog",
      "qty": 1,
      "unit_price": 0,
      "unit": "pcs",
      "alasan": "kenapa item ini dipilih berdasarkan gambar"
    }
  ],
  "catatan": "asumsi atau catatan tambahan untuk sales"
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
