import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import InterviewPage from "./InterviewPage";
import { sessionsApi } from "@/services/sessions";

// Spec 015 (AC-1 to AC-3). The session request, the audio hooks and the hardware check are stand-ins; only what the page
// decides to show is under test.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getCandidateInfo: vi.fn() } }));
vi.mock("@/hooks/useAudioCapture", () => ({
  useAudioCapture: () => ({ start: vi.fn(), stop: vi.fn(), mute: vi.fn(), unmute: vi.fn() }),
}));
vi.mock("@/hooks/useAudioPlayback", () => ({
  useAudioPlayback: () => ({
    playChunk: vi.fn(), stop: vi.fn(), scheduleAfterPlayback: vi.fn(), waitForDrain: vi.fn(), cancelDrain: vi.fn(),
  }),
}));
vi.mock("@/hooks/useAudioWebSocket", () => ({
  useAudioWebSocket: () => ({
    connect: vi.fn(), send: vi.fn(), sendJson: vi.fn(), disconnect: vi.fn(), connectionState: "disconnected",
  }),
}));
vi.mock("@/components/HardwareCheck", () => ({ default: () => <div>hardware check stand-in</div> }));

const getInfo = vi.mocked(sessionsApi.getCandidateInfo);

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/interview/token-for-tests"]}>
      <Routes>
        <Route path="/interview/:token" element={<InterviewPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const info = (status: string) =>
  ({ data: { session_id: 1, role_title: "Role", time_limit_min: 10, session_status: status } }) as never;

describe("InterviewPage when it loads the session", () => {
  beforeEach(() => {
    (sessionsApi as { getCandidateInfo: unknown }).getCandidateInfo = getInfo;
    getInfo.mockReset();
  });
  afterEach(cleanup);

  it("[015/AC-1] says the interview could not be loaded and never shows it as complete", async () => {
    // A plain function, not a mock: this vitest version fails a test whose mock returned a rejected promise.
    (sessionsApi as { getCandidateInfo: unknown }).getCandidateInfo = () => Promise.reject(new Error("network down"));

    renderPage();

    await waitFor(() => expect(screen.getByText(/could not be loaded/i)).toBeTruthy());
    expect(screen.queryByText("Interview Complete")).toBeNull();
  });

  it("[015/AC-2] shows the completion screen for a session that has ended", async () => {
    getInfo.mockResolvedValue(info("ended"));

    renderPage();

    await waitFor(() => expect(screen.getByText("Interview Complete")).toBeTruthy());
    expect(screen.queryByText(/could not be loaded/i)).toBeNull();
  });

  it("[015/AC-3] shows neither screen for a session that has not started", async () => {
    getInfo.mockResolvedValue(info("pending"));

    renderPage();

    await waitFor(() => expect(getInfo).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.queryByText("Interview Complete")).toBeNull();
    expect(screen.queryByText(/could not be loaded/i)).toBeNull();
  });
});
