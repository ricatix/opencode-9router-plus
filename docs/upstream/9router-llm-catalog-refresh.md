# 9router LLM catalog refresh

Catalog refresh is offline and audited. Pin an explicit 40 lowercase hexadecimal upstream SHA, review a separate refresh PR, then run local tooling against reviewed inputs.

Never execute upstream source. Never auto-apply detector output. Watch reports only identify whitelisted paths; they do not refresh the catalog, publish packages, tag releases, or create releases.

A refresh PR updates only catalog, manifest, and tests. Before merge, run `bun test` and `bun run build`. Any mismatch or failure leaves committed snapshot unchanged.
