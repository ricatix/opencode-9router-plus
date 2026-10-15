import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  realpath,
  rm,
  stat,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Only the Bun APIs consumed here; no ambient dependency or type suppression.
declare const Bun: {
  readonly which: (name: string) => string | null;
  readonly file: (path: string) => {
    readonly arrayBuffer: () => Promise<ArrayBuffer>;
  };
  readonly write: (path: string, content: string) => Promise<number>;
  readonly serve: (options: {
    readonly hostname: string;
    readonly port: number;
    readonly fetch: (request: Request) => Promise<Response>;
  }) => { readonly url: URL; readonly stop: (close: boolean) => void };
  readonly spawn: (
    args: readonly string[],
    options: {
      readonly cwd: string;
      readonly env: Record<string, string>;
      readonly stdout: "pipe";
      readonly stderr: "pipe";
    },
  ) => {
    readonly stdout: ReadableStream<Uint8Array>;
    readonly stderr: ReadableStream<Uint8Array>;
    readonly exited: Promise<number>;
    readonly kill: (signal: "SIGKILL") => void;
  };
};

// allow: SIZE_OK - One standalone opt-in runtime harness; task scope forbids helper files.

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
assert(
  process.argv
    .slice(2)
    .every((arg) =>
      ["--baseline", "--integrated", "--integration-listing"].includes(arg),
    ) && process.argv.slice(2).length <= 1,
  "usage: bun tests/reasoning-runtime.smoke.ts [--baseline|--integrated|--integration-listing]",
);
const baseline = process.argv.includes("--baseline");
const integrationListing = process.argv.includes("--integration-listing");
const mode = integrationListing
  ? "integration-listing"
  : baseline
    ? "baseline"
    : "integrated";
const evidenceRoot = join(
  root,
  ".omo/evidence/all-provider-reasoning-variants",
);
await mkdir(evidenceRoot, { recursive: true });
const evidence = await mkdtemp(
  join(
    evidenceRoot,
    integrationListing
      ? "task-5-listing-attempt-"
      : baseline
        ? "task-1-baseline-attempt-"
        : "task-6-attempt-",
  ),
);
const home = await mkdtemp(join(tmpdir(), "reasoning-runtime-"));
const known = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
  "thinking",
];
const commands: unknown[] = [];
const captures: Record<string, unknown>[] = [];
const listings: Record<string, unknown> = {};
const failures: string[] = [];
const identity: Record<string, unknown> = {};
const adversarial: string[] = [];
const findings: Record<string, unknown>[] = [];
const binary = Bun.which("opencode");
const plugin = join(root, "dist/index.js");
const formatCases = [
  ["openai", "none minimal low medium high xhigh"],
  ["claude-adaptive", "none low medium high xhigh max"],
  ["claude-budget", "none low medium high xhigh max"],
  ["gemini-level", "minimal low medium high"],
  ["gemini-budget", "none low medium high"],
  ["qwen", "none low medium high"],
  ["kimi", "none low medium high max"],
  ["deepseek", "none high max"],
  ["commandcode", "low medium high xhigh max"],
  ["hunyuan", "none low medium high"],
  ["step", "low medium high"],
  ["tokenrouter", "low medium high xhigh max"],
  ["zai", "none thinking"],
  ["minimax", "none thinking"],
] as const;
const collisionCases = [
  ["cmc/deepseek-v4.1-flash", "low medium high xhigh max"],
  ["ds/deepseek-v4.1-flash", "none low medium high xhigh max"],
  ["cbcn/deepseek-v4.1-flash", "low high max"],
  ["cbai/deepseek-v4.1-flash", "none low medium high xhigh max"],
  ["cbcn/deepseek-v4-pro", "low high xhigh"],
  ["cbai/deepseek-v4-pro", "low high xhigh"],
  ["cx/gpt-5.6-sol", "none minimal low medium high xhigh max ultra"],
] as const;
const sandbox =
  '(version 1)(allow default)(deny network-outbound)(allow network-outbound (remote ip "localhost:*"))';
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/v1/models")
      return Response.json({
        data: [
          ...(!baseline && !integrationListing
            ? [
                ...formatCases.map(([format]) => ({
                  id: `openai/task6-${format}`,
                  capabilities: { reasoning: true, thinkingFormat: format },
                })),
                ...collisionCases.map(([id]) => ({
                  id,
                  capabilities: { reasoning: true },
                })),
              ]
            : []),
          ...(integrationListing
            ? [
                {
                  id: "cmc/task5-new-model",
                  capabilities: {
                    reasoning: true,
                    thinkingFormat: "commandcode",
                  },
                },
                {
                  id: "cx/task5-toggle",
                  capabilities: {
                    reasoning: true,
                    thinkingFormat: "zai",
                    thinkingCanDisable: true,
                  },
                },
                {
                  id: "cx/task5-no-policy",
                  capabilities: {
                    reasoning: true,
                    thinkingFormat: "future-format",
                  },
                },
                {
                  id: "cx/task5-false",
                  capabilities: { reasoning: false, thinkingFormat: "openai" },
                },
                {
                  id: "cx/gpt-5.6-sol",
                  capabilities: { reasoning: "invalid", thinkingFormat: 42 },
                },
              ]
            : []),
          { id: "cmc/deepseek-v3.2", capabilities: { reasoning: true } },
          { id: "cx/gpt-5", capabilities: { reasoning: true } },
          { id: "fixture/toggle", capabilities: { reasoning: true } },
          { id: "fixture/plain", capabilities: { reasoning: false } },
          { id: "unknown/mystery" },
        ],
      });
    if (url.pathname !== "/v1/chat/completions")
      return new Response("unexpected", { status: 404 });
    const body: unknown = await request.json();
    assert(body && typeof body === "object" && !Array.isArray(body));
    assert(
      !JSON.stringify(body).includes('"disabled":'),
      "config tombstone leaked to wire",
    );
    captures.push({
      model: Reflect.get(body, "model"),
      reasoning_effort: Reflect.get(body, "reasoning_effort"),
      thinking: Reflect.get(body, "thinking"),
      disabled: Reflect.get(body, "disabled"),
      sdk: request.headers.get("user-agent"),
    });
    const chunk = {
      id: "offline",
      object: "chat.completion.chunk",
      created: 1,
      model: Reflect.get(body, "model"),
      choices: [{ index: 0, delta: { content: "OK" }, finish_reason: null }],
    };
    return new Response(
      `data: ${JSON.stringify(chunk)}\n\ndata: ${JSON.stringify({ ...chunk, choices: [{ index: 0, delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 } })}\n\ndata: [DONE]\n\n`,
      { headers: { "content-type": "text/event-stream" } },
    );
  },
});
const env = {
  PATH: process.env.PATH ?? "/usr/bin:/bin",
  HOME: home,
  XDG_CONFIG_HOME: join(home, "config"),
  XDG_CACHE_HOME: join(home, "cache"),
  XDG_DATA_HOME: join(home, "data"),
  XDG_STATE_HOME: join(home, "state"),
  OPENCODE_CONFIG: join(home, "opencode.json"),
  OPENCODE_DISABLE_AUTOUPDATE: "1",
  OPENCODE_DISABLE_MODELS_FETCH: "1",
  OPENCODE_DISABLE_DEFAULT_PLUGINS: "1",
  OPENCODE_9ROUTER_URL: `${server.url}v1`,
  OPENCODE_9ROUTER_API_KEY: "offline-dummy-key",
  OPENCODE_9ROUTER_TIMEOUT_MS: "2000",
  CI: "true",
  NO_COLOR: "1",
  BUN_CONFIG_REGISTRY: `${server.url}registry`,
  npm_config_registry: `${server.url}registry`,
};
async function execute(args: string[], timeout = 30000, executable = binary) {
  assert(executable, "OpenCode binary missing");
  const child = Bun.spawn(
    [
      "/usr/bin/sandbox-exec",
      "-p",
      sandbox,
      executable,
      ...args,
      "--print-logs",
    ],
    { cwd: home, env, stdout: "pipe", stderr: "pipe" },
  );
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill("SIGKILL");
  }, timeout);
  try {
    const [stdout, stderr, exit] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);
    commands.push({
      args,
      exit,
      timedOut,
      stdout: stdout.slice(-2500),
      stderr: stderr.slice(-6000),
    });
    assert(!timedOut, `subprocess timeout: ${args.join(" ")}`);
    assert(
      !/failed to load plugin/i.test(stderr),
      `plugin load failed: ${stderr}`,
    );
    return { stdout, stderr, exit };
  } finally {
    clearTimeout(timer);
    child.kill("SIGKILL");
    await child.exited;
  }
}
async function run(args: string[], timeout = 30000, executable = binary) {
  const { stdout, stderr, exit } = await execute(args, timeout, executable);
  assert.equal(exit, 0, `subprocess failed: ${stderr.slice(-2500)}`);
  return args.includes("--help") ? stdout + stderr : stdout;
}
function parseListing(stdout: string) {
  const models = new Map<string, Record<string, unknown>>();
  const pattern = /^9router\/([^\n]+)\n(\{[\s\S]*?\n\})/gm;
  for (const match of stdout.matchAll(pattern)) {
    assert(match[1] && match[2]);
    const value: unknown = JSON.parse(match[2]);
    assert(value && typeof value === "object" && !Array.isArray(value));
    const variants: unknown = Reflect.get(value, "variants");
    assert(
      variants && typeof variants === "object" && !Array.isArray(variants),
    );
    models.set(match[1], Object.fromEntries(Object.entries(variants)));
  }
  assert(models.size >= 5, "missing/malformed effective listing");
  return models;
}
function assertWire(
  selected: readonly Record<string, unknown>[],
  expected: Record<string, unknown>,
) {
  assert(selected.length > 0, "zero captured generation requests");
  for (const body of selected) {
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(body[key], value, `wire mismatch: ${key}`);
    assert.equal(body.disabled, undefined, "disabled leaked to wire");
  }
}
async function buildInputs() {
  const inputs: Record<string, string> = {};
  const entries = await readdir(join(root, "src"), { recursive: true });
  for (const input of [
    ...entries.filter((name) => name.endsWith(".ts")),
    "../tsconfig.json",
    "../package.json",
    "../bun.lock",
    "../package-lock.json",
  ]) {
    const source = join(root, "src", input);
    inputs[input] = createHash("sha256")
      .update(await readFile(source))
      .digest("hex");
    const output = join(root, "dist", input.replace(/\.ts$/, ".js"));
    const outputTime = input.endsWith(".ts")
      ? (await stat(output)).mtimeMs
      : (await stat(plugin)).mtimeMs;
    assert(
      outputTime >= (await stat(source)).mtimeMs,
      `stale dist input: ${input}`,
    );
  }
  return inputs;
}
async function config(
  variants?: Record<string, unknown>,
  npm = "@ai-sdk/openai-compatible",
  entry = plugin,
) {
  const model = {
    name: "gpt-5",
    reasoning: true,
    limit: { context: 32000, output: 2048 },
    ...(variants === undefined ? {} : { variants }),
  };
  await Bun.write(
    env.OPENCODE_CONFIG,
    JSON.stringify({
      plugin: [entry],
      enabled_providers: ["9router"],
      model: "9router/cx/gpt-5",
      small_model: "9router/fixture/plain",
      permission: { "*": "deny" },
      provider: {
        "9router": {
          npm,
          models: {
            "cx/gpt-5": model,
            "fixture/toggle": {
              ...model,
              variants: {
                thinking: { thinking: { type: "enabled" } },
                none: { thinking: { type: "disabled" } },
              },
            },
          },
        },
      },
    }),
  );
}
async function probe(name: string, check: () => Promise<void>) {
  try {
    await check();
  } catch (error) {
    if (!(error instanceof Error)) throw error;
    failures.push(`${name}: ${error.message}`);
  }
}
try {
  await mkdir(evidence, { recursive: true });
  assert(
    process.platform === "darwin" && Bun.which("sandbox-exec"),
    "network isolation unavailable",
  );
  assert(binary, "OpenCode binary missing");
  identity.binary = {
    realpath: await realpath(binary),
    sha256: createHash("sha256")
      .update(new Uint8Array(await Bun.file(binary).arrayBuffer()))
      .digest("hex"),
  };
  identity.buildInputs = await buildInputs();
  identity.plugin = {
    path: plugin,
    sha256: createHash("sha256")
      .update(new Uint8Array(await Bun.file(plugin).arrayBuffer()))
      .digest("hex"),
  };
  identity.builtModules = Object.fromEntries(
    await Promise.all(
      (await readdir(join(root, "dist"), { recursive: true }))
        .filter((name) => name.endsWith(".js"))
        .map(async (name) => [
          name,
          createHash("sha256")
            .update(await readFile(join(root, "dist", name)))
            .digest("hex"),
        ]),
    ),
  );
  const executableText = await readFile(binary, "utf8");
  const marker = executableText.indexOf("ai-sdk/openai-compatible/${");
  assert(marker > 0, "bundled adapter marker missing");
  const binding = /var (\w+)="([0-9]+\.[0-9]+\.[0-9]+)";[\s\S]*$/.exec(
    executableText.slice(marker - 400, marker),
  );
  assert(binding?.[1] && binding[2], "bundled adapter binding missing");
  assert(
    executableText
      .slice(marker)
      .startsWith(`ai-sdk/openai-compatible/\${${binding[1]}}`),
  );
  identity.adapter = {
    package: "@ai-sdk/openai-compatible",
    version: binding[2],
    bindingExcerpt: executableText.slice(marker - 400, marker + 120),
    sourceCommit: "unavailable",
  };
  for (const filename of ["models.dev.api.json", "models.dev.models.json"]) {
    const directory = join(home, ".cache/opencode-9router-plus");
    await mkdir(directory, { recursive: true });
    await Bun.write(
      join(directory, filename),
      JSON.stringify({ timestamp: Date.now(), data: {} }),
    );
  }
  identity.version = (await run(["--version"])).trim();
  const help = await run(["run", "--help"]);
  assert(
    help.includes("--variant") &&
      help.includes("--model") &&
      help.includes("--format"),
    "unsupported run CLI",
  );
  if (integrationListing) {
    const manual = {
      id: "cx/gpt-5",
      name: "Manual",
      reasoning: true,
      variants: {
        custom: { reasoningEffort: "ultra" },
        low: { disabled: true },
      },
    };
    await Bun.write(
      env.OPENCODE_CONFIG,
      JSON.stringify({
        plugin: [plugin],
        provider: { "9router": { models: { "cx/gpt-5": manual } } },
      }),
    );
    const stdout = await run(["models", "9router", "--verbose"]);
    await Bun.write(join(evidence, "effective-listing.txt"), stdout);
    const models = parseListing(stdout);
    listings.integration = Object.fromEntries(models);
    for (const [id, expected] of [
      ["cmc/task5-new-model", ["low", "medium", "high", "xhigh", "max"]],
      ["cx/task5-toggle", ["none", "thinking"]],
      ["cx/task5-no-policy", []],
      ["cx/task5-false", []],
      [
        "cx/gpt-5.6-sol",
        ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"],
      ],
      ["unknown/mystery", []],
    ] as const) {
      const effective = models.get(id);
      assert(effective, `fixture missing: ${id}`);
      assert.deepEqual(
        Object.keys(effective).sort(),
        [...expected].sort(),
        `effective keys: ${id}`,
      );
      for (const value of Object.values(effective)) {
        assert(value && typeof value === "object");
        assert.equal(Reflect.get(value, "disabled"), undefined);
      }
    }
    assert.deepEqual(models.get("cx/task5-toggle"), {
      none: { thinking: { type: "disabled" } },
      thinking: { thinking: { type: "enabled" } },
    });
    assert.deepEqual(models.get("cx/gpt-5")?.custom, {
      reasoningEffort: "ultra",
    });
    assert.equal(models.get("cx/gpt-5")?.low, undefined);
    for (const [id, reasoning] of [
      ["cx/task5-no-policy", true],
      ["cx/task5-false", false],
    ] as const) {
      const match = [
        ...stdout.matchAll(/^9router\/([^\n]+)\n(\{[\s\S]*?\n\})/gm),
      ].find((entry) => entry[1] === id);
      assert(match?.[2]);
      assert.equal(JSON.parse(match[2]).capabilities.reasoning, reasoning);
    }
    findings.push({
      classification: "LISTING_ONLY",
      loader: "direct built package entry",
    });
  } else if (!baseline) {
    const brokenEntry = join(home, "broken-plugin.mjs");
    await Bun.write(
      brokenEntry,
      'export default () => { throw new TypeError("offline-loader-probe"); };',
    );
    await config(undefined, "@ai-sdk/openai-compatible", brokenEntry);
    await assert.rejects(
      run(["models", "9router", "--verbose"]),
      /plugin load failed/,
    );
    adversarial.push(
      "actual loader error rejected even when binary exits zero",
    );
    await Bun.write(
      env.OPENCODE_CONFIG,
      JSON.stringify({
        plugin: [plugin],
        enabled_providers: ["9router"],
        model: "9router/cx/gpt-5.6-sol",
        small_model: "9router/fixture/plain",
        permission: { "*": "deny" },
        provider: {
          "9router": {
            models: {
              "fixture/manual": {
                name: "Manual",
                reasoning: true,
                limit: { context: 32000, output: 2048 },
                variants: { custom: { reasoningEffort: "ultra" } },
              },
            },
          },
        },
      }),
    );
    const listing = await run(["models", "9router", "--verbose"]);
    await Bun.write(join(evidence, "effective-listing.txt"), listing);
    const models = parseListing(listing);
    listings.integrated = Object.fromEntries(models);
    const matrix = [
      ...formatCases.map(
        ([format, levels]) => [`openai/task6-${format}`, levels] as const,
      ),
      ...collisionCases,
    ];
    for (const [id, levels] of matrix) {
      const effective = models.get(id);
      assert(effective, `missing fixture: ${id}`);
      const expected = Object.fromEntries(
        levels.split(" ").map((level) => [
          level,
          id.endsWith("-zai") || id.endsWith("-minimax")
            ? {
                thinking: { type: level === "none" ? "disabled" : "enabled" },
              }
            : { reasoningEffort: level },
        ]),
      );
      assert.deepEqual(effective, expected, `effective payloads: ${id}`);
      for (const variant of levels
        .split(" ")
        .filter((level) =>
          ["high", "max", "ultra", "thinking", "none"].includes(level),
        )) {
        const start = captures.length;
        await run([
          "run",
          "--model",
          `9router/${id}`,
          "--variant",
          variant,
          "--format",
          "json",
          "Reply OK only.",
        ]);
        const toggle = id.endsWith("-zai") || id.endsWith("-minimax");
        assertWire(
          captures.slice(start).filter((body) => body.model === id),
          {
            model: id,
            reasoning_effort: toggle ? undefined : variant,
            thinking: toggle
              ? { type: variant === "none" ? "disabled" : "enabled" }
              : undefined,
          },
        );
      }
    }
    for (const [id, variant] of [
      ["cmc/deepseek-v4.1-flash", "none"],
      ["cbcn/deepseek-v4.1-flash", "medium"],
      ["cx/gpt-5.6-sol", "invalid"],
      ["fixture/plain", "high"],
      ["unknown/mystery", "high"],
    ] as const) {
      const start = captures.length;
      const result = await execute([
        "run",
        "--model",
        `9router/${id}`,
        "--variant",
        variant,
        "--format",
        "json",
        "Reply OK only.",
      ]);
      assert.equal(
        captures.length - start,
        0,
        `unsupported selection generated requests: ${id}/${variant}`,
      );
      assert.match(
        result.stdout + result.stderr,
        /Unsupported 9router variant/,
        "missing explicit rejection",
      );
      findings.push({ id, variant, generationRequests: 0, exit: result.exit });
    }
    for (const [id, variant, effort] of [
      ["fixture/manual", "custom", "ultra"],
      ["cx/gpt-5.6-sol", undefined, "medium"],
    ] as const) {
      const start = captures.length;
      await run([
        "run",
        "--model",
        `9router/${id}`,
        ...(variant ? ["--variant", variant] : []),
        "--format",
        "json",
        "Reply OK only.",
      ]);
      assertWire(
        captures.slice(start).filter((body) => body.model === id),
        { model: id, reasoning_effort: effort, thinking: undefined },
      );
    }
    findings.push({
      unset:
        "medium is OpenCode native default; plugin model options contain no reasoningEffort",
    });
    assert.throws(() => assertWire([], {}), /zero captured/);
    assert.throws(
      () =>
        assertWire([{ reasoning_effort: "low" }], { reasoning_effort: "high" }),
      /wire mismatch/,
    );
    assert.throws(() => parseListing("success"));
    adversarial.push(
      "zero capture rejected",
      "wire mismatch rejected",
      "false success listing rejected",
    );
    await config(undefined, "@offline-fixture/missing-sdk");
    const beforeMissing = captures.length;
    await assert.rejects(
      run([
        "run",
        "--model",
        "9router/cx/gpt-5",
        "--variant",
        "high",
        "--format",
        "json",
        "Reply OK only.",
      ]),
      /subprocess failed/,
    );
    assert.throws(
      () => assertWire(captures.slice(beforeMissing), {}),
      /zero captured/,
    );
    adversarial.push(
      "missing SDK rejected; zero generation cannot count as wire proof",
    );
  } else {
    await config(undefined, "@ai-sdk/openai-compatible", plugin);
    parseListing(await run(["models", "9router", "--verbose"]));
    for (const [name, variants] of [
      ["missing", undefined],
      ["empty", {}],
      ["allowed", { high: { reasoningEffort: "high" } }],
      [
        "disabled",
        Object.fromEntries(
          known.map((key) => [
            key,
            key === "high" ? { reasoningEffort: "high" } : { disabled: true },
          ]),
        ),
      ],
    ] as const) {
      await probe(name, async () => {
        await config(variants);
        const models = parseListing(
          await run(["models", "9router", "--verbose"], 8000),
        );
        listings[name] = Object.fromEntries(models);
        for (const id of [
          "cmc/deepseek-v3.2",
          "fixture/plain",
          "unknown/mystery",
        ])
          assert(models.has(id), `fixture missing: ${id}`);
        assert.deepEqual(
          models.get("fixture/plain"),
          {},
          "nonreasoning fixture acquired variants",
        );
        assert.deepEqual(
          models.get("unknown/mystery"),
          {},
          "unknown fixture acquired variants",
        );
        assert.deepEqual(
          models.get("fixture/toggle")?.thinking,
          { thinking: { type: "enabled" } },
          "manual toggle overwritten",
        );
        const effective = models.get("cx/gpt-5");
        assert(effective);
        const additional = Object.keys(effective).filter(
          (key) => !known.includes(key),
        );
        assert.deepEqual(additional, [], "unhandled runtime builtin keys");
        if (name === "disabled")
          assert.deepEqual(
            Object.keys(effective).sort(),
            ["high"],
            "disabled tombstones ineffective",
          );
        else
          assert(
            "low" in effective && "high" in effective,
            "builtin additive baseline absent",
          );
      });
    }
    for (const [model, variant, expected] of [
      ["cx/gpt-5", "high", { reasoning_effort: "high" }],
      ["fixture/toggle", "thinking", { thinking: { type: "enabled" } }],
      ["fixture/toggle", "none", { thinking: { type: "disabled" } }],
    ] as const) {
      await probe(`wire-${variant}`, async () => {
        const start = captures.length;
        await run([
          "run",
          "--model",
          `9router/${model}`,
          "--variant",
          variant,
          "--format",
          "json",
          "Reply OK only.",
        ]);
        const selected = captures
          .slice(start)
          .filter((body) => body.model === model);
        assertWire(selected, expected);
      });
    }
    identity.sdk = {
      observedUserAgents: [...new Set(captures.map((body) => body.sdk))],
      provenance:
        "Wire proves provider-utils identity only. Adapter binding is separately inspected in identity.adapter; source commit unavailable.",
    };
    const binaryText = await readFile(binary, "utf8");
    const adapterMarker = binaryText.indexOf("ai-sdk/openai-compatible/${");
    assert(adapterMarker > 0, "bundled SDK adapter identity unavailable");
    const adapterPrefix = binaryText.slice(adapterMarker - 400, adapterMarker);
    const adapterVersion = /var (\w+)="([0-9]+\.[0-9]+\.[0-9]+)";[\s\S]*$/.exec(
      adapterPrefix,
    );
    assert(
      adapterVersion?.[1] && adapterVersion[2],
      "bundled SDK version binding unavailable",
    );
    assert(
      binaryText
        .slice(adapterMarker)
        .startsWith(`ai-sdk/openai-compatible/\${${adapterVersion[1]}}`),
      "SDK version binding mismatch",
    );
    identity.adapter = {
      package: "@ai-sdk/openai-compatible",
      version: adapterVersion[2],
      proof:
        "version binding in fingerprinted actual binary's adapter factory; wire header independently identifies provider-utils",
      sourceCommit: "unavailable",
      binding: adapterVersion[1],
      bindingExcerpt: binaryText.slice(
        adapterMarker - 400,
        adapterMarker + 120,
      ),
    };
    assert.equal(
      adapterVersion[2],
      "2.0.41",
      "unexpected bundled adapter version",
    );
    assert.throws(() => parseListing("9router/cx/gpt-5\n{}\n"));
    assert.throws(() => parseListing("success"));
    assert.throws(
      () => assertWire([], { reasoning_effort: "high" }),
      /zero captured/,
    );
    assert.throws(
      () =>
        assertWire([{ reasoning_effort: "low" }], { reasoning_effort: "high" }),
      /wire mismatch/,
    );
    await assert.rejects(run(["--version"], 1000, null), /binary missing/);
    await assert.rejects(
      run(["--version"], 1000, join(home, "missing-sdk-binary")),
      /subprocess failed/,
    );
    adversarial.push(
      "malformed listing rejected",
      "misleading success rejected",
      "zero capture rejected",
      "wire mismatch rejected",
      "missing binary rejected",
      "missing executable rejected (not SDK proof)",
    );
    const repeat = parseListing(await run(["models", "9router", "--verbose"]));
    assert.deepEqual(
      Object.fromEntries(repeat),
      listings.disabled,
      "repeat listing is flaky",
    );
    for (const variant of [undefined, "definitely-invalid-variant", "low"]) {
      await probe(`selection-${variant ?? "unset"}`, async () => {
        const start = captures.length;
        // Rejection may legitimately exit nonzero; loader errors/timeouts still fail.
        const result = await execute([
          "run",
          "--model",
          "9router/cx/gpt-5",
          ...(variant === undefined ? [] : ["--variant", variant]),
          "--format",
          "json",
          "Reply OK only.",
        ]);
        const generated = captures.slice(start);
        const selected = generated.filter((body) => body.model === "cx/gpt-5");
        findings.push({
          variant: variant ?? "unset",
          exit: result.exit,
          captures: generated,
          classification: selected.length
            ? "native-invalid-selection-fallback"
            : "rejected-before-generation",
        });
        if (baseline || variant === undefined) {
          assert.equal(result.exit, 0, "native baseline selection failed");
          assertWire(selected, { reasoning_effort: "medium" });
        } else {
          assert.equal(
            generated.length,
            0,
            "unsupported variant generated a request (task 6 enforcement required)",
          );
        }
      });
    }
    await config(undefined, "@offline-fixture/missing-sdk");
    const beforeMissingSdk = captures.length;
    await assert.rejects(
      run([
        "run",
        "--model",
        "9router/cx/gpt-5",
        "--variant",
        "high",
        "--format",
        "json",
        "Reply OK only.",
      ]),
      /subprocess failed/,
    );
    assert.throws(
      () =>
        assertWire(
          captures
            .slice(beforeMissingSdk)
            .filter((body) => body.model === "cx/gpt-5"),
          { reasoning_effort: "high" },
        ),
      /zero captured/,
    );
    adversarial.push(
      "missing SDK: CLI exit 1 and mandatory actual-capture assertion rejected zero captures",
    );
  }
  assert.deepEqual(
    await buildInputs(),
    identity.buildInputs,
    "source inputs changed during runtime proof",
  );
  assert.equal(failures.length, 0, failures.join("\n"));
} catch (error) {
  if (!(error instanceof Error)) throw error;
  failures.push(error.message);
  process.exitCode = 1;
} finally {
  server.stop(true);
  await rm(home, { recursive: true, force: true });
  await mkdir(evidence, { recursive: true });
  await Bun.write(
    join(
      evidence,
      integrationListing
        ? "task-5-runtime.json"
        : baseline
          ? "task-1-runtime.json"
          : "task-6-wire.json",
    ),
    JSON.stringify(
      {
        status: failures.length
          ? "FAIL"
          : integrationListing
            ? "INTEGRATION_LISTING_PASS"
            : baseline
              ? "BASELINE_PASS"
              : "INTEGRATED_PASS",
        mode,
        integratedEnforcement:
          baseline || integrationListing
            ? "PENDING_TASK_6_NOT_PASSED"
            : failures.length
              ? "FAIL"
              : "PASS",
        identity,
        commands,
        listings,
        captures,
        failures,
        adversarial,
        findings,
        resources: { home, server: server.url.href },
        cleanup:
          "server stopped; bounded children reaped; temporary HOME removed",
        isolation:
          "allowlisted subprocess env, dummy key, macOS sandbox denies non-loopback outbound",
        limitations: [
          "Single installed binary only; upstream source provenance unavailable",
          baseline
            ? "Task 1 config fixtures only"
            : "Offline forwarding only; upstream enforcement not measured",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        status: failures.length
          ? "FAIL"
          : integrationListing
            ? "INTEGRATION_LISTING_PASS"
            : baseline
              ? "BASELINE_PASS"
              : "INTEGRATED_PASS",
        mode,
        failures,
        evidence,
      },
      null,
      2,
    ),
  );
}
