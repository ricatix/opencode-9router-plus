# Monitoring

Repository ini tidak mendokumentasikan service berjalan, telemetry, atau health
endpoint. Karena itu tidak ada metrik atau probe operasional yang dapat
diasumsikan tersedia.

Gunakan pemeriksaan CLI untuk diagnosis konfigurasi lokal:

```bash
npx opencode-9router-plus check
```

Untuk informasi freshness metadata, gunakan diagnostik cache age yang tersedia
di CLI. Cache `models.dev` berlaku 24 jam dan dibatasi ukurannya.

Perubahan upstream dipantau melalui laporan saja, bukan refresh katalog
otomatis. Rujuk [laporan perubahan 9router](../upstream/9router-change-report.md).

Lihat [troubleshooting](troubleshooting.md) untuk langkah penanganan masalah.
