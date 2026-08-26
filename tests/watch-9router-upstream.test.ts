import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const renderer = join(root, "scripts/render-9router-upstream-report.sh");
const fixture = join(root, "tests/fixtures/9router-compare.json");
const golden = join(root, "tests/fixtures/9router-change-report.md");
const previous = "1111111111111111111111111111111111111111";
const current = "2222222222222222222222222222222222222222";

async function run(args: string[]) {
  return Bun.spawn([renderer, ...args], { stdout: "pipe", stderr: "pipe" })
    .exited;
}

describe("watch 9router upstream", () => {
  test("renderer writes deterministic whitelist-only golden report and preserves output on failures", async () => {
    const dir = await mkdtemp(join(tmpdir(), "9router-watch-"));
    const output = join(dir, "report.md");
    await writeFile(output, "keep\n");
    expect(
      await run([
        "--previous",
        previous,
        "--current",
        current,
        "--compare",
        fixture,
        "--output",
        output,
      ]),
    ).toBe(0);
    expect(await readFile(output, "utf8")).toBe(await readFile(golden, "utf8"));
    expect(await readFile(output, "utf8")).toContain(
      "Detector/report-only: never refreshes catalog, alters runtime, publishes, tags, or releases.",
    );
    const bytes = await readFile(output);
    expect(
      await run([
        "--previous",
        `a${previous.slice(1)}`.toUpperCase(),
        "--current",
        current,
        "--compare",
        fixture,
        "--output",
        output,
      ]),
    ).not.toBe(0);
    expect(await readFile(output)).toEqual(bytes);
    expect(
      await run([
        "--previous",
        previous,
        "--previous",
        previous,
        "--current",
        current,
        "--compare",
        fixture,
        "--output",
        output,
      ]),
    ).not.toBe(0);
    expect(
      await run([
        "--previous",
        previous,
        "--current",
        current,
        "--compare",
        fixture,
        "--output",
        output,
        "--bad",
      ]),
    ).not.toBe(0);
    const source = await readFile(renderer, "utf8");
    expect(source).toContain('mktemp "${TMPDIR:-/tmp}/9router-report.XXXXXX"');
    expect(source).not.toContain('tmp="${output}.tmp.$$"');
  });

  test("renderer accepts filename-only compare data, rejects bad schema, and does not mutate equal SHA", async () => {
    const dir = await mkdtemp(join(tmpdir(), "9router-watch-"));
    const output = join(dir, "report.md");
    await writeFile(output, "keep\n");
    expect(
      await run([
        "--previous",
        previous,
        "--current",
        previous,
        "--compare",
        fixture,
        "--output",
        output,
      ]),
    ).toBe(0);
    expect(await readFile(output, "utf8")).toBe("keep\n");
    const bad = join(dir, "bad.json");
    await writeFile(bad, '{"files":[{"filename":4}],"truncated":true}');
    expect(
      await run([
        "--previous",
        previous,
        "--current",
        current,
        "--compare",
        bad,
        "--output",
        output,
      ]),
    ).not.toBe(0);
    expect(await readFile(output, "utf8")).toBe("keep\n");
  });

  test("renderer checkpoints incomplete 300-file compare results with a manual-audit report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "9router-watch-"));
    const output = join(dir, "report.md");
    const compare = join(dir, "compare.json");
    await writeFile(output, "keep\n");
    await writeFile(
      compare,
      JSON.stringify({
        files: Array.from({ length: 300 }, (_, index) => ({
          filename:
            index === 299
              ? "open-sse/providers/registry/late.js"
              : `ignored/${index}.js`,
        })),
      }),
    );
    expect(
      await run([
        "--previous",
        previous,
        "--current",
        current,
        "--compare",
        compare,
        "--output",
        output,
      ]),
    ).toBe(0);
    const report = await readFile(output, "utf8");
    expect(report).toContain(`Current upstream SHA: \`${current}\``);
    expect(report).toContain("## Incomplete comparison");
    expect(report).toContain("Manual audit required.");
    expect(report).toContain("cannot be trusted for catalog refresh");
    expect(report).toContain("Never execute upstream.");
    expect(report).not.toContain("late.js");
  });

  test("workflow uses scheduled dispatch-only checkpointed PR flow", async () => {
    const workflow = await readFile(
      join(root, ".github/workflows/watch-9router-upstream.yml"),
      "utf8",
    );
    expect(workflow.match(/^permissions:\n((?: {2}[^\n]+\n)+)/m)?.[1]).toBe(
      "  contents: write\n  pull-requests: write\n",
    );
    expect(workflow).toMatch(/^on:\n {2}schedule:/m);
    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain(
      "gh api repos/decolua/9router/git/ref/heads/master",
    );
    expect(workflow).toContain(
      'scripts/render-9router-upstream-report.sh --previous "$PREVIOUS" --current "$CURRENT" --compare "$compare" --output docs/upstream/9router-change-report.md',
    );
    expect(workflow).toContain(
      "add-paths: docs/upstream/9router-change-report.md",
    );
    expect(workflow).not.toMatch(
      /src\/generated\/9router-llm-catalog\.ts|bun (install|test|run build|run extract)|actions\/checkout[^\n]*(ref:|repository:)|(?:create|push) tag|release|publish|automerge|git push.*main/i,
    );
  });
});
