import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LiveMonitorPage from "./LiveMonitorPage";
import { sessionsApi } from "@/services/sessions";

// Spec 017 (AC-1). The service and the coverage socket are stand-ins; the rejection comes from a plain function.
vi.mock("@/services/sessions", () => ({ sessionsApi: { get: vi.fn(), getTranscript: vi.fn(), endSession: vi.fn() } }));
vi.mock("@/hooks/useCoverageWebSocket", () => ({
  useCoverageWebSocket: () => ({ coverageMap: null, sessionEnded: false, sessionEndReason: null, isConnected: false }),
}));

describe("LiveMonitorPage when it loads the session", () => {
  afterEach(cleanup);

  it("[017/AC-1] shows the not found message and not the monitor for a session that does not exist", async () => {
    const service = sessionsApi as unknown as { get: unknown; getTranscript: unknown };
    service.get = () => Promise.reject({ response: { status: 404 } });
    service.getTranscript = () => Promise.reject({ response: { status: 404 } });

    render(
      <MemoryRouter initialEntries={["/assessments/1/sessions/18/monitor"]}>
        <Routes>
          <Route path="/assessments/:id/sessions/:sessionId/monitor" element={<LiveMonitorPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Live Monitor")).toBeNull();
  });
});
