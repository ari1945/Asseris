/* ============================================================
   Asseris — klok SSOT (K-02), lapisan pemakaian
   ------------------------------------------------------------
   `AMS.TODAY` sudah lama menjadi satu-satunya anchor "hari ini". PR #231
   mencabut tanggal-tanggal BEKU (`'2026-03-09'` yang diketik di modul) dan
   menutup K-02 sebagaimana ia dirumuskan di katalog. Yang TIDAK ia sentuh
   adalah kelas kedua dengan akibat yang sama: `new Date()` — jam sistem mesin
   yang menjalankan aplikasi.

   Bedanya halus dan justru itu sebabnya ia bertahan: tanggal beku salah pada
   hari pertama dan gampang terlihat; `new Date()` selalu "masuk akal", ia
   hanya tidak berhubungan dengan perikatan mana pun. Kertas kerja yang
   dibubuhi 22 Agustus 2026 pada perikatan yang klok-nya 9 Maret 2026 tidak
   dapat direkonsiliasi dengan tanggal apa pun di sekitarnya — dan angka
   turunan waktu (umur, jatuh tempo, "lewat N hari") bergeser diam-diam setiap
   hari tanpa satu pun berkas berubah.

   ATURAN MODUL INI
     · Bagian TANGGAL selalu dari `AMS.TODAY`.
     · Bagian JAM (bila format memintanya) tetap jam nyata — "hari ini" yang
       dibekukan adalah HARInya, bukan detiknya; membekukan jam juga akan
       meruntuhkan pengurutan log yang memakai stempel ini sebagai kunci.
     · Format dirakit TANGAN, bukan lewat `toLocaleDateString`, supaya nilainya
       tidak bergeser satu hari mengikuti zona waktu mesin (`new Date('2026-03-09')`
       adalah tengah malam UTC). Keluarannya identik dengan format id-ID yang
       digantikannya — lihat `clock_ssot.test.ts`.

   YANG SENGAJA TIDAK DILAYANI modul ini: stempel yang HANYA jam (mis. waktu
   pesan obrolan, "dinarasikan pukul 14.22"). Di sana tak ada tanggal yang bisa
   salah, jadi jam sistem memang jawaban yang benar.
   ============================================================ */
import { AMS } from './data';

/* ---- inti MURNI: klok diberikan sebagai argumen, dapat diuji ---- */

const BULAN_SINGKAT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

type Ymd = { y: string; m: number; d: string };

function parse(today: string): Ymd | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(today || '');
  if (!m) return null;
  const mon = Number(m[2]);
  return mon >= 1 && mon <= 12 ? { y: m[1], m: mon, d: m[3] } : null;
}

/** `'2026-03-09'` — pengganti `new Date().toISOString().slice(0, 10)` dan `toLocaleDateString('en-CA')`. */
export function ssotDateIso(today: string): string {
  const p = parse(today);
  return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${p.d}` : '';
}

/** `'09 Mar 2026'` — pengganti `toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })`. */
export function ssotDateShortId(today: string): string {
  const p = parse(today);
  return p ? `${p.d} ${BULAN_SINGKAT[p.m - 1]} ${p.y}` : '';
}

/** `'09 Maret 2026'` — pengganti varian `month:'long'`. */
export function ssotDateLongId(today: string): string {
  const p = parse(today);
  return p ? `${p.d} ${BULAN_PANJANG[p.m - 1]} ${p.y}` : '';
}

/** `'09 Mar'` — pengganti varian tanpa tahun. */
export function ssotDayMonthId(today: string): string {
  const p = parse(today);
  return p ? `${p.d} ${BULAN_SINGKAT[p.m - 1]}` : '';
}

/** `2026` — pengganti `new Date().getFullYear()` untuk "tahun berjalan". */
export function ssotYear(today: string): number {
  const p = parse(today);
  return p ? Number(p.y) : NaN;
}

/** `'2026-03-09 14:22'` — pengganti `toISOString().slice(0, 16).replace('T', ' ')`. */
export function ssotStamp(today: string, hhmm: string): string {
  const iso = ssotDateIso(today);
  return iso ? `${iso} ${hhmm}` : '';
}

/** `'2026-03-09T14:22:33.123Z'` — tanggal SSOT, jam nyata, dinyatakan sebagai UTC
    supaya `slice(0, 10)` di hilir SELALU mengembalikan tanggal SSOT apa pun zona
    waktu mesinnya. */
export function ssotIsoTs(today: string, hms: string): string {
  const iso = ssotDateIso(today);
  return iso ? `${iso}T${hms}Z` : '';
}

/* ---- pembungkus tanpa argumen: klok SSOT + jam nyata ---- */

const two = (n: number): string => String(n).padStart(2, '0');
const three = (n: number): string => String(n).padStart(3, '0');

function clock(): string { return String((AMS && AMS.TODAY) || ''); }

/** `'14.22'` — jam nyata dalam format id-ID (pemisah titik). Tak ada tanggal
    yang bisa salah di sini; ia dipakai untuk merakit stempel bertanggal. */
export function amsClockId(): string {
  const n = new Date();
  return `${two(n.getHours())}.${two(n.getMinutes())}`;
}

/** `'2026-03-09'` */
export function amsDateIso(): string { return ssotDateIso(clock()); }
/** `'09 Mar 2026'` */
export function amsDateShortId(): string { return ssotDateShortId(clock()); }
/** `'09 Maret 2026'` */
export function amsDateLongId(): string { return ssotDateLongId(clock()); }
/** `'09 Mar'` */
export function amsDayMonthId(): string { return ssotDayMonthId(clock()); }
/** `2026` */
export function amsYear(): number { return ssotYear(clock()); }

/** `'2026-03-09 14:22'` — tanggal SSOT + jam nyata (pengurutan log tetap hidup). */
export function amsStamp(): string {
  const n = new Date();
  return ssotStamp(clock(), `${two(n.getHours())}:${two(n.getMinutes())}`);
}

/** `'2026-03-09T14:22:33.123Z'` — tanggal SSOT + jam nyata. */
export function amsIsoTs(): string {
  const n = new Date();
  return ssotIsoTs(clock(), `${two(n.getHours())}:${two(n.getMinutes())}:${two(n.getSeconds())}.${three(n.getMilliseconds())}`);
}

/** `'09 Mar, 14.22'` — pengganti varian `toLocaleString` tanpa tahun. */
export function amsDayMonthTimeId(): string {
  return amsDayMonthId() + ', ' + amsClockId();
}

/** `'09 Mar 2026, 14.22'` — pengganti `toLocaleString('id-ID', {…tanggal…, hour, minute})`. */
export function amsDateTimeShortId(): string {
  return `${amsDateShortId()}, ${amsClockId()}`;
}

/** Objek `Date` pada TENGAH MALAM LOKAL tanggal SSOT — untuk aritmetika hari
    ("lewat N hari"), bukan untuk diformat. Tengah malam lokal dipilih supaya
    selisih hari terhadap tanggal lain yang juga di-parse lokal tetap bulat. */
export function amsTodayDate(): Date {
  const p = parse(clock());
  return p ? new Date(Number(p.y), p.m - 1, Number(p.d)) : new Date(NaN);
}
