# Pengembangan lokal

## Prasyarat

Gunakan Bun untuk memasang dependency dan menjalankan perintah repository.

```bash
bun install
```

## Siklus kerja

Jalankan pemeriksaan gabungan sebelum menyerahkan perubahan:

```bash
bun run check
```

Bangun artefak distribusi bila diperlukan:

```bash
bun run build
```

Untuk memasang plugin melalui OpenCode:

```bash
opencode plugin opencode-9router-plus
```

Lihat [perintah verifikasi](../reference/verification-commands.md) untuk
perintah terpisah dan [variabel lingkungan](../reference/environment-variables.md)
untuk konfigurasi runtime.
