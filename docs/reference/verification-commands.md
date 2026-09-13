# Perintah verifikasi

Pasang dependency terlebih dahulu:

```bash
bun install
```

| Perintah | Kegunaan |
| --- | --- |
| `bun test` | Menjalankan test Bun. |
| `bun run check` | Menjalankan format check, lint, knip, typecheck, dan test deterministik. |
| `bun run typecheck` | Menjalankan TypeScript tanpa emit. |
| `bun run lint` | Menjalankan linter Biome. |
| `bun run format:check` | Memeriksa format Biome. |
| `bun run format` | Menulis format Biome. |
| `bun run knip` | Memeriksa kode yang tidak digunakan. |
| `bun run build` | Membuat `dist/`. |
| `bun run clean` | Menghapus `dist/`. |
| `bun run prepublishOnly` | Menjalankan clean dan build untuk publish. |
| `bun run test:live` | Smoke test live; hanya dengan `OPENCODE_9ROUTER_API_KEY`. |
| `opencode plugin opencode-9router-plus` | Memasang plugin melalui OpenCode. |
| `npx opencode-9router-plus check` | Memeriksa konfigurasi plugin. |

CI utama menjalankan `bun install --frozen-lockfile` lalu `bun run check`.
Release untuk tag `v*.*.*` memakai Node 24 dan `npm ci`, menjalankan pemeriksaan
Bun, lalu `npm publish`.
