'use client';

// ── Midnight Olive brand palette ──────────────────────────
const C = {
  PRIMARY:   [26,  46,  26],   // #1a2e1a
  SECONDARY: [45,  90,  45],   // #2d5a2d
  ACCENT:    [74, 124,  89],   // #4a7c59
  LIGHT:     [212, 237, 218],  // #d4edda
  LIGHT_BG:  [244, 248, 245],  // #f4f8f5
  GRAY:      [74, 101,  80],   // #4a6550
  BLACK:     [15,  31,  15],   // #0f1f0f
  WHITE:     [255, 255, 255],
};

// ── Load logo dari public/ → base64 ──────────────────────
async function loadLogo() {
  try {
    const res = await fetch('/logo-instand.png');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('FileReader error'));
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn('[PDF] Logo gagal dimuat:', err.message);
    return null;
  }
}

// ── Helpers ───────────────────────────────────────────────
const rp = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');

// Dapatkan dimensi gambar asli dari dataURL
async function getImageDimensions(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload  = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 1, h: 1 });
    img.src = dataUrl;
  });
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
}

// ═══════════════════════════════════════════════════════════
//  MAIN EXPORT
//  Catatan: selling_price saja yang masuk PDF (HPP & laba
//  bersifat internal, TIDAK ditampilkan ke klien)
//  refImages = array of { name, data (base64 dataURL) }
// ═══════════════════════════════════════════════════════════
export async function generateQuotationPDF({
  client_name,
  project_name,
  items,
  selling_price,
  discount_amount = 0,
  notes,
  refImages = [],
}) {
  const { default: jsPDF }     = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc   = new jsPDF({ unit:'mm', format:'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M     = 15;

  const today = new Date();
  const tgl   = today.toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' });
  const exp   = addDays(today, 3);
  const noRef = `INS/${today.getFullYear()}${String(today.getMonth()+1).padStart(2,'0')}/${Math.floor(Math.random()*9000)+1000}`;

  // ── 0. Load logo ─────────────────────────────────────────
  const logoB64 = await loadLogo();

  // ── 1. Header background ─────────────────────────────────
  doc.setFillColor(...C.PRIMARY);
  doc.rect(0, 0, pageW, 50, 'F');
  doc.setFillColor(...C.SECONDARY);
  doc.rect(0, 35, pageW, 15, 'F');

  // Logo — TANPA border putih
  const LOGO_SIZE = 26;
  const LOGO_X    = M;
  const LOGO_Y    = (35 - LOGO_SIZE) / 2;
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', LOGO_X, LOGO_Y, LOGO_SIZE, LOGO_SIZE);
  }

  // Brand text
  const TX = logoB64 ? LOGO_X + LOGO_SIZE + 7 : M;
  doc.setTextColor(...C.WHITE);
  doc.setFontSize(19);
  doc.setFont('helvetica', 'bold');
  doc.text('INSTAND', TX, LOGO_Y + 10);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 220, 190);
  // FIX: tidak pakai emoji — jsPDF helvetica tidak support unicode emoji
  doc.text('Booth Portable Profesional', TX, LOGO_Y + 17);
  doc.text('IG: @instand_booth  |  WA: 081-9999-463-53', TX, LOGO_Y + 23);

  // Judul dokumen kanan atas
  doc.setTextColor(...C.WHITE);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('SURAT PENAWARAN HARGA', pageW - M, LOGO_Y + 8, { align:'right' });
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(180, 220, 190);
  doc.text('No. Ref  : ' + noRef,  pageW - M, LOGO_Y + 15, { align:'right' });
  doc.text('Tanggal  : ' + tgl,    pageW - M, LOGO_Y + 21, { align:'right' });

  // Accent bar
  doc.setFillColor(...C.ACCENT);
  doc.rect(0, 50, pageW, 3, 'F');

  // ── 2. Client info box ───────────────────────────────────
  let y = 63;
  doc.setFillColor(...C.LIGHT_BG);
  doc.setDrawColor(...C.LIGHT);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, pageW - M*2, 32, 3, 3, 'FD');

  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.GRAY);
  doc.text('KEPADA YTH.', M + 5, y + 8);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.BLACK);
  doc.text(client_name.toUpperCase(), M + 5, y + 17);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.GRAY);
  doc.text('Project : ' + project_name, M + 5, y + 24);

  // Berlaku s/d — TANPA emoji
  doc.setFontSize(7.5);
  doc.setTextColor(...C.ACCENT);
  doc.setFont('helvetica', 'bold');
  doc.text('Berlaku s/d : ' + exp, pageW - M - 5, y + 24, { align:'right' });

  y += 42;

  // ── 3. Intro paragraph ───────────────────────────────────
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.BLACK);
  const intro = 'Dengan hormat, bersama ini kami dari INSTAND mengajukan penawaran harga untuk ' +
    project_name + ' sesuai kebutuhan yang telah didiskusikan. Berikut daftar spesifikasi booth yang kami tawarkan:';
  const introLines = doc.splitTextToSize(intro, pageW - M*2);
  doc.text(introLines, M, y);
  y += introLines.length * 5 + 7;

  // ── 4. Tabel item — dengan Harga Satuan & Subtotal ────────
  const rows = items.map((item, i) => [
    i + 1,
    item.item_name,
    item.qty + ' ' + (item.unit || 'pcs'),
    rp(item.unit_price),
    rp(item.unit_price * item.qty),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['No', 'Deskripsi Item / Spesifikasi', 'Qty', 'Harga Satuan', 'Subtotal']],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: C.PRIMARY,
      textColor: C.WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
      cellPadding: 3.5,
    },
    bodyStyles: {
      fontSize: 8.5,
      cellPadding: 3.5,
      textColor: C.BLACK,
    },
    columnStyles: {
      0: { halign:'center', cellWidth:10 },
      1: { cellWidth:'auto' },
      2: { halign:'center', cellWidth:20 },
      3: { halign:'right',  cellWidth:35 },
      4: { halign:'right',  cellWidth:35, fontStyle:'bold', textColor: C.ACCENT },
    },
    alternateRowStyles: { fillColor: C.LIGHT_BG },
    margin: { left: M, right: M },
    didDrawPage: (data) => {
      doc.setFillColor(...C.PRIMARY);
      doc.rect(0, pageH - 11, pageW, 11, 'F');
      doc.setTextColor(180, 220, 190);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text('INSTAND - Booth Portable Profesional', M, pageH - 4);
      doc.text('Halaman ' + data.pageNumber, pageW - M, pageH - 4, { align:'right' });
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── 5. Total Harga ────────────────────────────────────────
  const BOX_W    = 100;
  const BOX_X    = pageW - M - BOX_W;
  const hasDisc  = discount_amount > 0;
  const finalPrc = selling_price - (hasDisc ? discount_amount : 0);

  if (hasDisc) {
    // Baris: Harga Penawaran
    doc.setFillColor(...C.LIGHT_BG);
    doc.setDrawColor(...C.LIGHT);
    doc.setLineWidth(0.3);
    doc.roundedRect(BOX_X, y, BOX_W, 10, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.GRAY);
    doc.text('Harga Penawaran', BOX_X + 4, y + 6.5);
    doc.text(rp(selling_price), pageW - M - 3, y + 6.5, { align:'right' });
    y += 10;

    // Baris: Diskon
    doc.setFillColor(255, 243, 224);
    doc.setDrawColor(253, 186, 116);
    doc.roundedRect(BOX_X, y, BOX_W, 10, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(180, 80, 0);
    doc.text('Diskon Khusus', BOX_X + 4, y + 6.5);
    doc.text('- ' + rp(discount_amount), pageW - M - 3, y + 6.5, { align:'right' });
    y += 10;

    // Garis pemisah
    doc.setDrawColor(...C.ACCENT);
    doc.setLineWidth(0.6);
    doc.line(BOX_X, y, pageW - M, y);
    y += 3;
  }

  // Kotak Total Bayar
  doc.setFillColor(...C.ACCENT);
  doc.roundedRect(BOX_X, y, BOX_W, hasDisc ? 14 : 16, 2, 2, 'F');
  doc.setTextColor(...C.WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(hasDisc ? 8 : 8.5);
  doc.text(hasDisc ? 'TOTAL BAYAR' : 'TOTAL HARGA PENAWARAN', BOX_X + 4, y + (hasDisc ? 5.5 : 6));
  doc.setFontSize(hasDisc ? 12 : 13);
  doc.text(rp(finalPrc), pageW - M - 3, y + (hasDisc ? 11.5 : 13), { align:'right' });

  y += hasDisc ? 18 : 20;
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...C.GRAY);
  doc.text(
    '*Harga sudah mencakup seluruh item di atas. Ongkos kirim sesuai tabel jika tercantum.',
    pageW - M, y, { align:'right' }
  );

  // ── 6. Catatan — TANPA emoji ─────────────────────────────
  if (notes?.trim()) {
    // Split per baris \n dulu, lalu wrap per lebar halaman
    const rawLines  = notes.trim().split('\n');
    const noteLines = rawLines.flatMap(line =>
      doc.splitTextToSize(line.trim() || ' ', pageW - M*2)
    );
    const notesBlockH = 6 + 6 + noteLines.length * 4.8 + 6; // title + gap + content + bottom

    // Pastikan ada ruang cukup — kalau tidak, pindah ke halaman baru
    if (y + notesBlockH > pageH - 20) {
      doc.addPage();
      // Gambar footer di halaman lama sudah di-handle, cukup reset y
      y = 20;
    } else {
      y += 8;
    }

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...C.BLACK);
    doc.text('Catatan Khusus:', M, y);
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...C.GRAY);
    noteLines.forEach(line => {
      // Cek per baris — kalau sudah mepet footer, tambah halaman
      if (y > pageH - 20) {
        doc.addPage();
        y = 20;
      }
      doc.text(line, M, y);
      y += 4.8;
    });
    y += 8;
  } else {
    y += 12;
  }

  // ── 7. Syarat & Ketentuan (dynamic height) ───────────────
  if (y > pageH - 85) { doc.addPage(); y = 20; }

  const TERMS = [
    '- Penawaran berlaku selama 3 hari sejak tanggal dikeluarkan.',
    '- DP 50% untuk konfirmasi order, pelunasan sebelum pengiriman.',
    '- Estimasi pengerjaan 7-14 hari kerja setelah DP diterima.',
    '- Harga belum termasuk ongkos kirim (jika tidak tercantum di atas).',
  ];
  const LINE_H    = 4.8;
  const TITLE_H   = 8;
  const PADDING_V = 6;
  const termsH    = TITLE_H + TERMS.length * LINE_H + PADDING_V;

  doc.setFillColor(...C.LIGHT_BG);
  doc.setDrawColor(...C.LIGHT);
  doc.setLineWidth(0.4);
  doc.roundedRect(M, y, pageW - M*2, termsH, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.BLACK);
  doc.text('Syarat & Ketentuan:', M + 5, y + TITLE_H - 1);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.GRAY);
  TERMS.forEach((t, i) => doc.text(t, M + 5, y + TITLE_H + 4 + i * LINE_H));

  // ── 8. Tanda Tangan ───────────────────────────────────────
  y += termsH + 10;
  if (y > pageH - 45) { doc.addPage(); y = 20; }

  const colW = (pageW - M*2) / 2 - 4;

  doc.setFillColor(...C.LIGHT_BG);
  doc.roundedRect(M, y, colW, 36, 2, 2, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.BLACK);
  doc.text('Menyetujui,', M + 5, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.GRAY);
  doc.text('(tanda tangan & stempel)', M + 5, y + 13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.BLACK);
  doc.text(client_name, M + 5, y + 32);

  const sigX = M + colW + 8;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.BLACK);
  doc.text('Malang, ' + tgl, sigX, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.GRAY);
  doc.text('Hormat kami,', sigX, y + 13);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...C.ACCENT);
  doc.text('INSTAND', sigX, y + 29);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...C.GRAY);
  doc.setFontSize(7.5);
  doc.text('Tim Sales', sigX, y + 34);

  // ── 9. Footer halaman ini ─────────────────────────────────
  doc.setFillColor(...C.PRIMARY);
  doc.rect(0, pageH - 11, pageW, 11, 'F');
  doc.setTextColor(180, 220, 190);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('INSTAND - Booth Portable Profesional', M, pageH - 4);
  doc.text('No. Ref: ' + noRef, pageW - M, pageH - 4, { align:'right' });

  // ── 10. Halaman Referensi Gambar (jika ada) ───────────────
  if (refImages && refImages.length > 0) {
    doc.addPage();

    // Header halaman referensi
    doc.setFillColor(...C.PRIMARY);
    doc.rect(0, 0, pageW, 20, 'F');
    doc.setFillColor(...C.ACCENT);
    doc.rect(0, 20, pageW, 2, 'F');
    doc.setTextColor(...C.WHITE);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('REFERENSI DESAIN', M, 13);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 220, 190);
    doc.text('Acuan Desain', M, 18);

    let ry = 30;
    const IMG_COL_W = (pageW - M*2 - 8) / 2;  // lebar per kolom (2 kolom)
    const MAX_IMG_H = 90;                        // tinggi maksimum per gambar
    let col = 0;

    for (let idx = 0; idx < refImages.length; idx++) {
      const img = refImages[idx];
      try {
        // Hitung dimensi asli gambar
        const dims   = await getImageDimensions(img.data);
        const ratio  = dims.w / dims.h;
        const maxW   = IMG_COL_W - 4;
        const maxH   = MAX_IMG_H;

        let drawW, drawH;
        if (ratio > maxW / maxH) {
          drawW = maxW;
          drawH = maxW / ratio;
        } else {
          drawH = maxH;
          drawW = maxH * ratio;
        }

        const frameH = drawH + 14; // frame = gambar + ruang label
        const rx     = M + col * (IMG_COL_W + 8);

        // Background frame sesuai tinggi gambar asli
        doc.setFillColor(...C.LIGHT_BG);
        doc.setDrawColor(...C.LIGHT);
        doc.setLineWidth(0.4);
        doc.roundedRect(rx, ry, IMG_COL_W, frameH, 2, 2, 'FD');

        // Gambar — center horizontal dalam frame
        const offsetX = (IMG_COL_W - drawW) / 2;
        doc.addImage(img.data, 'JPEG', rx + offsetX, ry + 2, drawW, drawH);

        // Label nama file
        doc.setFontSize(7);
        doc.setTextColor(...C.GRAY);
        doc.setFont('helvetica', 'normal');
        const label = 'Ref. ' + (idx + 1) + (img.name ? ': ' + img.name.substring(0, 28) : '');
        doc.text(label, rx + 3, ry + drawH + 9);

        col++;
        if (col >= 2) {
          col = 0;
          ry += frameH + 6;
          if (ry > pageH - MAX_IMG_H - 30) {
            doc.addPage();
            ry = 20;
          }
        }
      } catch(e) {
        console.warn('[PDF] Gagal embed gambar referensi:', e.message);
      }
    }

    // Footer halaman referensi
    doc.setFillColor(...C.PRIMARY);
    doc.rect(0, pageH - 11, pageW, 11, 'F');
    doc.setTextColor(180, 220, 190);
    doc.setFontSize(7);
    doc.text('INSTAND - Booth Portable Profesional', M, pageH - 4);
    doc.text('No. Ref: ' + noRef, pageW - M, pageH - 4, { align:'right' });
  }

  // ── 11. Save ─────────────────────────────────────────────
  const fname = 'Penawaran_INSTAND_' +
    client_name.replace(/\s+/g,'_') + '_' +
    today.getFullYear() +
    String(today.getMonth()+1).padStart(2,'0') +
    String(today.getDate()).padStart(2,'0') + '.pdf';
  doc.save(fname);
  return fname;
}
