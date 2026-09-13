# Ikhtisar arsitektur

`opencode-9router-plus` adalah plugin OpenCode TypeScript ESM. Runtime di
`src/index.ts` menemukan model dari endpoint `/models`, lalu `/model`, lalu base
URL, memvalidasi `id` eksplisit, dan menginjeksikan konfigurasi provider
`9router`.

Pemetaan model di `src/model-mapper.ts` menggabungkan metadata live, katalog
statis yang telah ditinjau, enrichment `models.dev` untuk metadata nonboolean,
dan fallback aman. Metadata live diprioritaskan untuk nilai yang tersedia.

Katalog statis dihasilkan oleh extractor yang diaudit. Upstream watch hanya
menghasilkan laporan; ia tidak menyegarkan katalog secara otomatis.

Cache filesystem untuk `models.dev` berlaku 24 jam dan dibatasi ukurannya.
CLI menyediakan `install`, `check`, dan `uninstall`; pengeditan fallback untuk
file JSONC ditolak.

Lihat juga [pengembangan lokal](../guides/local-development.md) dan
[monitoring](../operations/monitoring.md).
