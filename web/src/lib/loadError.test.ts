import { describe, it, expect } from "vitest";
import { loadErrorMessage } from "./loadError";

// Spec 016 (AC-1): each kind of failure gets its own sentence.
const withStatus = (status: number) => ({ response: { status } });

describe("loadErrorMessage", () => {
  it("[016/AC-1] gives each kind of failure its own sentence, and says not found for a 404", () => {
    const messages = [404, 403, 422, 500].map((s) => loadErrorMessage(withStatus(s)));

    expect(messages[0]).toMatch(/not found/i);
    expect(new Set(messages).size).toBe(4);
    expect(loadErrorMessage(undefined)).toBe(messages[3]);
    expect(loadErrorMessage(new Error("network down"))).toBe(messages[3]);
  });
});
