# Variabel lingkungan

| Variabel | Kegunaan |
| --- | --- |
| `OPENCODE_9ROUTER_URL` | Base URL provider 9router. Default menggunakan HTTPS. |
| `OPENCODE_9ROUTER_API_KEY` | API key provider 9router. |
| `OPENCODE_9ROUTER_TIMEOUT_MS` | Timeout runtime dalam milidetik. |

Simpan `OPENCODE_9ROUTER_API_KEY` hanya di environment. Jangan menuliskannya ke
dokumentasi, konfigurasi, atau log.

`bun run test:live` memerlukan `OPENCODE_9ROUTER_API_KEY`. Lihat
[keamanan](../security/security.md) dan
[perintah verifikasi](verification-commands.md).
