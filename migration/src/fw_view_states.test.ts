// @vitest-environment jsdom
/* ============================================================
   PR-1 — keadaan JUJUR benar-benar sampai ke DOM

   Uji `fw_canon.test.ts` membuktikan mesinnya menolak menyimpulkan. Berkas ini
   membuktikan penolakan itu TERLIHAT: cacat yang ditutup PR-1 bukan hanya soal
   nilai kembalian, melainkan soal layar yang menyatakan kerangka yang tak
   pernah ditetapkan.

   Menguji logikanya saja mengulang mode kegagalan yang tercatat di proyek ini
   (uji memaku jalur yang tidak dipakai view). Karena itu di sini view yang
   sebenarnya dirender, lalu isinya dibaca dari DOM.
   ============================================================ */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuditContext, FirmContext, NavContext, NavFromContext } from './contexts';
import { FrameworkView } from './view_framework';
import { CLIENTS } from './data_part1';

const h = React.createElement;

type Root = { render: (node: unknown) => void; unmount: () => void };

let container: HTMLDivElement | null = null;
let root: Root | null = null;

beforeEach(() => {
  /* Tanpa bendera ini React memuntahkan "not configured to support act(...)"
     untuk setiap pembaruan — bising, dan menyamarkan peringatan sungguhan. */
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  try { localStorage.clear(); } catch { /* jsdom tanpa storage */ }
  container = document.createElement('div');
  document.body.appendChild(container);
  React.act(() => { root = createRoot(container as HTMLDivElement) as unknown as Root; });
});

afterEach(() => {
  React.act(() => { (root as Root).unmount(); });
  container?.remove();
  container = null;
  root = null;
});

/** Provider minimal — hanya konteks yang benar-benar dibaca modul & SubBar. */
function render(): string {
  const firm = { activeEngagement: { id: 'ENG-2025-014', fy: 'FY2025' }, activeClient: { id: 'C-014', name: 'PT Sentosa Makmur Tbk' } };
  React.act(() => {
    (root as Root).render(
      h(NavContext.Provider, { value: () => {} },
        h(NavFromContext.Provider, { value: null },
          h(FirmContext.Provider, { value: firm },
            h(AuditContext.Provider, { value: { wtb: [] } },
              h(FrameworkView, null))))),
    );
  });
  return (container as HTMLDivElement).textContent ?? '';
}

describe('view_framework — keadaan jujur terlihat di layar', () => {
  it('kandidat baru yang belum dinilai TIDAK menampilkan kerangka apa pun', () => {
    const teks = render();
    expect(teks).toContain('Belum dapat disimpulkan');
    /* Panel verdict tidak boleh menyatakan penetapan yang tak pernah terjadi. */
    expect(teks).not.toContain('Kerangka pelaporan ditetapkan');
  });

  it('menawarkan pilihan "Belum" — kontrol tiga keadaan, bukan dua', () => {
    render();
    const tombol = Array.from((container as HTMLDivElement).querySelectorAll('button'))
      .map(b => b.textContent);
    expect(tombol.filter(t => t === 'Belum').length).toBeGreaterThanOrEqual(3);
    /* Dan ketiganya benar-benar terpilih pada render pertama. */
    const ditekan = Array.from((container as HTMLDivElement).querySelectorAll('button[aria-pressed="true"]'))
      .map(b => b.textContent);
    expect(ditekan.filter(t => t === 'Belum').length).toBe(3);
  });

  it('nama klien di tabel portofolio berasal dari registri, bukan literal', () => {
    const teks = render();
    for (const c of CLIENTS) expect(teks).toContain(c.name);
    /* Nama karangan yang dulu ada tidak boleh muncul lagi. */
    expect(teks).not.toContain('PT Bumi Hijau Agrindo Tbk');
    expect(teks).not.toContain('PT Graha Properti Investama Tbk');
    expect(teks).not.toContain('PT Sinar Kreatif Mandiri');
  });

  it('klien tanpa neraca saldo menampilkan strip, bukan Rp 0', () => {
    const teks = render();
    /* C-052 berstatus Proposal — tak punya perikatan, jadi tak punya figur. */
    expect(teks).toContain('PT Karya Beton Perkasa');
    expect(teks).not.toContain('Rp 0 jt');
  });

  /* Keadaan jujur yang tak dapat ditindaklanjuti hanyalah jalan buntu yang
     sopan. Baris yang menunggu WAJIB membawa kontrol jawabannya sendiri. */
  it('baris portofolio yang menunggu membawa kontrol jawaban, bukan sekadar keluhan', () => {
    const teks = render();
    expect(teks).toContain('Belum disimpulkan');

    const baris = Array.from((container as HTMLDivElement).querySelectorAll('tr'))
      .filter(tr => (tr.textContent || '').includes('PT Cahaya Logistik Nusantara'));
    expect(baris).toHaveLength(1);

    const tombol = Array.from(baris[0].querySelectorAll('button')).map(b => b.textContent);
    expect(tombol).toContain('Ya');
    expect(tombol).toContain('Tidak');
  });

  /* C-052 menunggu di GERBANG 1 (fidusia), bukan gerbang 2 — gerbang 2 belum
     terbuka selama akuntabilitas publik belum disingkirkan. Karena itu barisnya
     menawarkan kontrol fidusia, dan pesan "neraca saldo belum tersedia" baru
     muncul sesudah fidusia dijawab. Uji unit gerbang-2 ada di fw_canon.test.ts;
     yang dijaga di sini hanya bahwa barisnya tidak buntu. */
  it('klien tanpa perikatan pun tetap punya jalan menjawab', () => {
    render();
    const baris = Array.from((container as HTMLDivElement).querySelectorAll('tr'))
      .filter(tr => (tr.textContent || '').includes('PT Karya Beton Perkasa'));
    expect(baris).toHaveLength(1);
    const tombol = Array.from(baris[0].querySelectorAll('button')).map(b => b.textContent);
    expect(tombol).toContain('Tidak');
    /* Figurnya tetap kosong — strip, bukan Rp 0. */
    expect(baris[0].textContent).toContain('—');
  });

  it('implikasi mengikat tidak diterbitkan sebelum kerangka ditetapkan', () => {
    const teks = render();
    expect(teks).toContain('implikasi tidak');
    /* Bentuk opini spesifik-kerangka tak boleh terbit dari kerangka null. */
    expect(teks).not.toContain('basis akuntansi sesuai SAK EMKM');
  });
});
