# Keamanan

## Rahasia

API key diberikan melalui `OPENCODE_9ROUTER_API_KEY`. Jangan menyimpan atau
mencetak key di dokumentasi, konfigurasi, maupun log.

## Batas data runtime

Base URL default menggunakan HTTPS. Data discovery provider diperlakukan sebagai
tidak tepercaya: runtime menerima hanya `id` eksplisit yang valid serta membatasi
dan menormalisasi metadata yang dipertahankan.

## Penyimpanan lokal

Penulisan konfigurasi dan cache dilakukan secara atomik. Cache filesystem
`models.dev` memiliki TTL 24 jam dan batas ukuran. CLI menolak fallback edit
JSONC berkomentar.

## Katalog

Refresh katalog offline yang diaudit tidak melakukan `eval`, instalasi, atau
jaringan. Upstream watch hanya membuat laporan; perubahan upstream tidak
langsung menjadi pembaruan katalog.

Lihat [arsitektur](../architecture/overview.md) dan
[variabel lingkungan](../reference/environment-variables.md).
