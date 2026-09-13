# Troubleshooting

## Konfigurasi atau provider tidak terdeteksi

Jalankan pemeriksaan CLI:

```bash
npx opencode-9router-plus check
```

Pastikan variabel lingkungan runtime tersedia sesuai
[referensi variabel lingkungan](../reference/environment-variables.md).

## Model tidak muncul atau metadata terbatas

Runtime mencoba discovery `/models`, kemudian `/model`, lalu base URL. Hanya
respons dengan `id` eksplisit yang valid digunakan. Model yang tidak cocok
dengan katalog atau metadata yang tidak ambigu memakai fallback aman; capability
boolean tidak diambil dari `models.dev`.

## Konfigurasi berkomentar gagal diubah

CLI menolak fallback pengeditan untuk JSONC. Gunakan konfigurasi JSON yang
sesuai atau lakukan perubahan file berkomentar secara manual.

## Validasi perubahan gagal

Jalankan perintah yang relevan dari
[referensi perintah verifikasi](../reference/verification-commands.md) untuk
mengisolasi format, lint, typecheck, atau test deterministik.
