// @vitest-environment node
import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Spec 011 (AC-1): a production build never contains the development token, whatever its environment holds.
const MARKER = "marker-dev-token-must-not-ship";

describe("production bundle", () => {
  it("[011/AC-1] does not contain the development token", () => {
    const out = mkdtempSync(join(tmpdir(), "web-bundle-"));
    try {
      execFileSync("node", ["node_modules/vite/bin/vite.js", "build", "--outDir", out, "--emptyOutDir", "--logLevel", "error"], {
        cwd: process.cwd(),
        env: { ...process.env, NODE_ENV: "production", VITE_DEV_TOKEN: MARKER },
        stdio: "pipe",
      });
      const files = readdirSync(out, { recursive: true, withFileTypes: true }).filter((e) => e.isFile());
      expect(files.length).toBeGreaterThan(0);
      const offenders = files
        .map((e) => join(e.parentPath, e.name))
        .filter((f) => readFileSync(f, "utf8").includes(MARKER));
      expect(offenders).toEqual([]);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  }, 120_000);
});
