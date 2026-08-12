# SPIKE — Penyimpanan Attachment S3-compatible (Tahap 6)

> Spike (bukan full rollout): membuktikan seam penyimpanan lampiran bukti audit bisa memindahkan
> byte keluar dari kolom DB ke object store S3-compatible (AWS S3 / MinIO / Cloudflare R2) tanpa
> mengubah router/view. Hasil: branch `storageKind='s3'` di `server/src/attachments/blobStore.ts`
> + `server/src/attachments/s3Store.ts`, diuji terhadap client S3 yang di-mock (dan siap diuji ke
> endpoint nyata begitu `S3_*` dikonfigurasi). Keputusan produksi yang BELUM diambil di spike ini
> dicatat di §4 — jangan menganggap spike = siap produksi.

## 1. Kenapa

Sebelum spike: semua byte lampiran hidup inline di kolom `Attachment.blob` (AES-256-GCM, single
tenant). Itu aman dan sederhana untuk beban pilot, tapi (a) DB membesar dengan file (backup/restore
ikut membawa seluruh byte), (b) tidak ada isolasi storage per kelas retensi, (c) tidak ada jalan
menuju object-lock/immutability yang disediakan S3. Tahap 6 sudah memisahkan lifecycle
soft-delete → purge (retention worker); spike ini memisahkan storage-nya: byte boleh tinggal di
object store, metadata + kunci enkripsi tetap di DB.

## 2. Yang dibangun

- `server/src/attachments/s3Store.ts` — adapter S3-compatible (AWS SDK v3) + `readS3Settings()`
  (master switch `ATTACHMENT_STORAGE=s3`, wajib `S3_BUCKET`; `S3_ENDPOINT`/`S3_FORCE_PATH_STYLE=1`
  untuk MinIO/R2; kredensial via env atau default credential chain EC2).
- Branch `storageKind='s3'` di `blobStore.ts`:
  - `writeBlob()` → `putObject('attachments/<id>', bytes)`; row menyimpan `objectKey`, `blob=null`.
  - `readBlob()` → `getObject(objectKey)`; `purgeBlob()` → `deleteObject(objectKey)`.
- Router/view **tidak berubah**: seam tetap satu-satunya tempat yang tahu di mana byte berada.
- Kriptografi tidak dilemahkan: byte yang di-upload lewat jalur S3 tetap melewati enkripsi
  AES-256-GCM aplikasi + AAD (attachmentAad) SEBELUM dikirim ke object store — S3 hanya tempat
  penyimpanan ciphertext, bukan pengganti kontrol enkripsi-at-rest aplikasi.

## 3. Cara uji

```bash
# 1) Unit: branch s3 diuji terhadap client yang di-mock (secrets.test.ts pattern) — tanpa layanan.
cd server && npx vitest run src/__tests__/stage6_evidence_lifecycle.test.ts

# 2) Live (MinIO lokal):
#    docker run -p 9000:9000 -e MINIO_ROOT_USER=minio -e MINIO_ROOT_PASSWORD=minio123 minio/minio server /data
#    ATTACHMENT_STORAGE=s3 S3_ENDPOINT=http://127.0.0.1:9000 S3_BUCKET=attachments \
#    S3_ACCESS_KEY_ID=minio S3_SECRET_ACCESS_KEY=minio123 S3_FORCE_PATH_STYLE=1 npm start
#    lalu upload/download/remove satu lampiran lewat UI/API → byte ada di bucket, `blob` row = null.
```

## 4. Temuan & keputusan yang BELUM diambil (jangan skip sebelum produksi)

1. **Object Lock / immutability**: S3 Object Lock (Compliance mode) bisa mengunci objek selama
   masa retensi — spike ini TIDAK mengonfigurasinya; keputusan apakah immutability dijamin di
   S3 (Object Lock) atau tetap di aplikasi (GCM tag + AAD + hash-chain) perlu kajian. Kelemahan
   GCM tag di aplikasi: tag dihasilkan dengan kunci APP_ENCRYPTION_KEY — rotasi kunci otomatis
   menulis ulang ciphertext (bukan bukti keaslian lintas-waktu seperti tanda tangan asimetris).
2. **Enkripsi sisi bucket**: SSE-S3/SSE-KMS opsional lapisan kedua; aplikasi sudah enkripsi
   sendiri, jadi SSE bukan syarat keamanan, hanya operasional.
3. **Lifecycle bucket**: expiration otomatis TIDAK boleh dipakai — penghapusan harus lewat
   retention worker (approval + legal hold) supaya jejak audit `ATTACH_PURGE` selalu mendahului
   hilangnya byte. Lifecycle yang tak sinkron dengan audit = bukti pemusnahan tak dapat
   dipertanggungjawabkan (docs/DATA-RETENTION-POLICY.md §4).
4. **IAM minimal**: policy harus `s3:PutObject/GetObject/DeleteObject` pada prefix
   `attachments/*` saja — bukan akses bucket penuh.
5. **Quota/scope tetap DB-side**: ukuran & kuota tetap dihitung dari `Attachment.size` (kolom),
   tidak perlu membaca object store untuk menghitung penggunaan.
6. **Migrasi data**: backfill inline→s3 butuh job yang membaca tiap blob, menulis ke bucket,
   lalu null `blob` + set `objectKey` — belum dibangun (dan tak boleh menulis ulang ciphertext
   tanpa melewati alur yang sama dengan rotasi kunci).

## 5. Referensi

- Seam penyimpanan: `server/src/attachments/blobStore.ts` · adapter: `server/src/attachments/s3Store.ts`
- Lifecycle hide→purge: `server/src/attachments/retention.ts` + `server/src/retentionWorker.ts`
- Kebijakan retensi & pemusnahan: `docs/DATA-RETENTION-POLICY.md` · rotasi kunci: `docs/KEY-ROTATION.md`
