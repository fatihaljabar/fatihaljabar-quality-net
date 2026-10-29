import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FitGapReportPage from "./FitGapReportPage";
import { sessionsApi } from "@/services/sessions";

// Spec 017 (AC-3). The services and the polling hook are stand-ins; the rejection comes from a plain function.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getPortfolio: vi.fn() } }));
vi.mock("@/services/portfolios", () => ({ portfoliosApi: {} }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: () => undefined }));

describe("FitGapReportPage when it loads the session", () => {
  afterEach(cleanup);

  it("[017/AC-3] shows the not found message and not the report page for a session that does not exist", async () => {
    (sessionsApi as unknown as { getPortfolio: unknown }).getPortfolio = () =>
      Promise.reject({ response: { status: 404 } });

    render(
      <MemoryRouter initialEntries={["/assessments/1/sessions/18/fitgap/3"]}>
        <Routes>
          <Route path="/assessments/:id/sessions/:sessionId/fitgap/:vacancyId" element={<FitGapReportPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Fit/Gap Report")).toBeNull();
  });
});
