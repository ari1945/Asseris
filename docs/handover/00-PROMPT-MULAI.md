# Prompt sesi pertama untuk agen/LLM baru

> Salin seluruh blok di bawah sebagai pesan pertama di alat apa pun (Codex, Cursor, Aider,
> Gemini CLI, Copilot, atau Claude). Ganti `<tugas>` di akhir dengan tugas hari itu, atau
> biarkan agar agen memulai dari sensus.

```
Kamu melanjutkan pengembangan Asseris (aplikasi audit KAP, React+Vite+TS di migration/,
tRPC+Prisma di server/). Repo ini dikembangkan sampai 2026-09-07 oleh agen lain; SEMUA
konteks yang kamu butuhkan ada di dalam repo — tidak ada memori atau percakapan lain.

Baca berurutan, seluruhnya, sebelum menyentuh kode:
1. AGENTS.md — §0 aturan kerja pemilik repo (PRD dulu, "Proceed." sebelum implementasi,
   tanpa asumsi senyap, kebenaran di atas persetujuan), §1–§8 arsitektur & gerbang,
   §9 perkakas.
2. docs/handover/HANDOVER-2026-09-07.md — keadaan repo, kerja terparkir, pekerjaan
   terbuka yang diprioritaskan, keputusan Ari yang mengikat.
3. docs/handover/memory/00-INDEKS.md — indeks 191 catatan pelajaran/jebakan. Jangan baca
   semuanya; baca yang indeksnya relevan dengan tugasmu, plus bagian "Aturan & jebakan
   yang paling sering menggigit".
4. docs/prompts-perbaikan/00-LANJUTKAN.md — metode arc "prompt perbaikan per modul"
   (investigasi dulu, verifikasi tiap klaim, tulis yang sudah benar, pisahkan
   kerjakan/usulkan, gerbang harus merah dulu).
5. docs/PRD-REGISTRY.md — status semua PRD.

Aturan yang tidak boleh dilanggar:
- master SELALU hijau: `npm run verify` dari root sebelum push. Cacat yang belum ditutup
  dikirim sebagai it.fails()/it.skip() + `// KARANTINA s/d <tanggal>`.
- Jangan pernah menyimpulkan "sudah mendarat" dari `git log`/`git cherry`/"N ahead" —
  master menerima PR lewat squash. Bandingkan hash blob dan pohon
  (`git diff --name-only origin/master <cabang>`).
- Jangan `git checkout -- <berkas>` sebelum commit — itu menghapus kerja belum-commit.
- Jangan mengarang data audit (pelaku, nomor dokumen, prosedur, identitas
  firma/perikatan). Angka dari canon*/data, bukan hardcode.
- Perubahan kebijakan/metode/alur kerja/angka lintas-modul → tulis docs/usulan-*.md,
  lalu BERHENTI dan minta keputusan.
- Sebelum membangun fitur: PRD (template di 00-DASHBOARD/Templates/prd-template.md
  di vault Obsidian; kalau tak terjangkau, ikuti struktur PRD yang ada di docs/prd-*.md),
  tunggu "Proceed.".
- Bahasa kerja Indonesia. Tanpa pengisi, tanpa sanjungan; tunjukkan asumsi, risiko,
  dan tingkat keyakinan.

Mulai dengan:
(a) `git fetch && git status --short && git branch --show-current` — pastikan pohon
    bersih dan kamu di cabang kerja sendiri di atas origin/master;
(b) `gh pr list --state open` — sebutkan PR yang masih terbuka;
(c) konfirmasi singkat apa yang kamu pahami sebagai tiga pekerjaan terbuka teratas dari
    HANDOVER §5, dan pertanyaan yang HANYA bisa dijawab Ari;
lalu kerjakan: <tugas>
```
