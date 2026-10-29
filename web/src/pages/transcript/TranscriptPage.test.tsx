import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TranscriptPage from "./TranscriptPage";
import { sessionsApi } from "@/services/sessions";

// Spec 017 (AC-4, AC-6). The service is a stand-in; the rejection comes from a plain function.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getTranscript: vi.fn(), get: vi.fn() } }));

const service = sessionsApi as unknown as { getTranscript: unknown; get: unknown };

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/assessments/1/sessions/18/transcript"]}>
      <Routes>
        <Route path="/assessments/:id/sessions/:sessionId/transcript" element={<TranscriptPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("TranscriptPage when it loads the transcript", () => {
  beforeEach(() => {
    service.get = () => Promise.resolve({ data: { session: { candidate_name: "Budi" } } });
  });
  afterEach(cleanup);

  it("[017/AC-4] says not found for a session that does not exist, not a generic failure", async () => {
    service.getTranscript = () => Promise.reject({ response: { status: 404 } });

    renderPage();

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText(/Failed to load transcript/i)).toBeNull();
  });

  it("[017/AC-6] shows the turns of a session that has a transcript", async () => {
    service.getTranscript = () =>
      Promise.resolve({ data: { turns: [{ id: 1, speaker: "ai", text: "Hello, tell me about your work.", turn_number: 1 }] } });

    renderPage();

    await waitFor(() => expect(screen.getByText("Hello, tell me about your work.")).toBeTruthy());
  });
});
