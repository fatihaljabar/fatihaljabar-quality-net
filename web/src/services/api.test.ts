import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import type { AxiosError, InternalAxiosRequestConfig } from "axios";
import api from "./api";

// Spec 014 (AC-1 to AC-3). The network is replaced by an adapter that answers with a fixed status.
const STORED = "stored-token-for-tests";

function answerWith(status: number) {
  api.defaults.adapter = (config: InternalAxiosRequestConfig) =>
    Promise.reject({ isAxiosError: true, config, response: { status, data: {}, config } } as unknown as AxiosError);
}

describe("api client response handling", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", STORED);
    vi.stubGlobal("location", { href: "/assessments" });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("[014/AC-1] keeps the session on a 403 and hands the error to the caller", async () => {
    answerWith(403);

    await expect(api.get("/assessments")).rejects.toMatchObject({ response: { status: 403 } });

    expect(localStorage.getItem("auth_token")).toBe(STORED);
    expect(window.location.href).toBe("/assessments");
  });

  it("[014/AC-2] ends the session on a 401 and goes to the login page", async () => {
    answerWith(401);

    await expect(api.get("/assessments")).rejects.toMatchObject({ response: { status: 401 } });

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(window.location.href).toBe("/login");
  });

  it("[014/AC-3] does not redirect when the login request itself is refused", async () => {
    answerWith(401);

    await expect(api.post("/auth/login", { email: "a@b.test", password: "wrong" })).rejects.toMatchObject({
      response: { status: 401 },
    });

    expect(window.location.href).toBe("/assessments");
  });
});
