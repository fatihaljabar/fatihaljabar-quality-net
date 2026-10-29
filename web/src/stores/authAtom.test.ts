import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { getStoredToken } from "./authAtom";

// Spec 011 (AC-2 to AC-4). The development token in the environment is a marker, not a real token.
const ENV_TOKEN = "env-token-for-tests";
const STORED_TOKEN = "stored-token-for-tests";

describe("getStoredToken", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubEnv("VITE_DEV_TOKEN", ENV_TOKEN);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    localStorage.clear();
  });

  it("[011/AC-2] falls back to the development token in development mode", () => {
    vi.stubEnv("DEV", true);

    expect(getStoredToken()).toBe(ENV_TOKEN);
  });

  it("[011/AC-3] ignores the development token in production mode", () => {
    vi.stubEnv("DEV", false);

    expect(getStoredToken()).toBeNull();
  });

  // A plain loop, not it.each: the release check finds a criterion by a tag that opens the test name.
  for (const dev of [true, false]) {
    it(`[011/AC-4] prefers the stored token (development mode: ${dev})`, () => {
      vi.stubEnv("DEV", dev);
      localStorage.setItem("auth_token", STORED_TOKEN);

      expect(getStoredToken()).toBe(STORED_TOKEN);
    });
  }
});
