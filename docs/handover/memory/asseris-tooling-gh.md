---
name: asseris-tooling-gh
description: Lokasi gh CLI & cara buka PR di repo Asseris (gh tak ada di PATH; Bash tool tak bisa lihat gh)
metadata: 
  node_type: memory
  type: reference
  originSessionId: 5405fe26-4609-45e6-b6ab-d1c2715578c5
  modified: 2026-07-30T13:39:02.562Z
---

Repo Asseris remote: `https://github.com/ari1945/Asseris.git` (akun `ari1945`, gh login via keyring).

**Gotcha:** `gh` TIDAK ada di PATH, dan **Bash tool sama sekali tak menemukan `gh`** (`command not found`). Terinstal di **`C:\Program Files\GitHub CLI\gh.exe`** (v2.95+). Untuk operasi GitHub (PR/issue), pakai **PowerShell** dengan path penuh:

```
& "C:\Program Files\GitHub CLI\gh.exe" pr create --base master --head <branch> --title "..." --body-file "$env:TEMP\pr_body.md"
```

Tulis body PR ke file dulu (`Out-File -Encoding utf8`) untuk hindari masalah quoting multiline. `git push` biasa jalan normal (kredensial HTTPS tersimpan). Default/main branch = `master`. Workflow repo = PR-based.

**Gotcha kedua (2026-07-30): `jq` TIDAK ada** di lingkungan ini (Bash tool: `jq: command not found`). Resep Monitor untuk menunggu CI yang memakai `gh pr checks --json … | jq` akan berjalan diam sampai timeout **tanpa satu pun event** — kelihatan seperti CI menggantung, padahal skripnya yang mati. Tunggu CI dengan `gh pr checks <n>` polos (output TSV: nama⇥status⇥durasi⇥url) lalu baca sendiri, atau pakai `--json` dengan `ConvertFrom-Json` di PowerShell. Jangan asumsikan jq tersedia hanya karena `gh` tersedia.
