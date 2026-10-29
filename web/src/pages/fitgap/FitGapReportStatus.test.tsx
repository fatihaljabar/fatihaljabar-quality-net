import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FitGapReportPage from "./FitGapReportPage";
import { sessionsApi } from "@/services/sessions";
import { portfoliosApi } from "@/services/portfolios";
import { usePolling } from "@/hooks/usePolling";
import sample from "../../../../contracts/fit-gap-report.json";

// Spec 020 (AC-1 to AC-4). The services are stand-ins that answer with a report in a given status; the polling hook is a
// recorder, so the test can see whether the page asked to keep checking.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getPortfolio: vi.fn() } }));
vi.mock("@/services/portfolios", () => ({ portfoliosApi: { getFitGap: vi.fn(), regenerateFitGap: vi.fn() } }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: vi.fn() }));

const sessions = sessionsApi as unknown as { getPortfolio: unknown };
const portfolios = portfoliosApi as unknown as { getFitGap: unknown };
const polling = vi.mocked(usePolling);

function answerWith(status: string, comparisons: unknown[], error: string | null = null) {
  sessions.getPortfolio = () => Promise.resolve({ data: { portfolio: { id: 5, skills: [] } } });
  portfolios.getFitGap = () =>
    Promise.resolve({
      data: { report: { ...sample, skill_comparisons: comparisons, generation_status: status, generation_error: error } },
    });
}

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/assessments/1/sessions/18/fitgap/3"]}>
      <Routes>
        <Route path="/assessments/:id/sessions/:sessionId/fitgap/:vacancyId" element={<FitGapReportPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const keepsChecking = () => polling.mock.calls.some((call) => call[2] === true);

describe("FitGapReportPage when it reads the status of the report", () => {
  beforeEach(() => polling.mockClear());
  afterEach(cleanup);

  for (const status of ["pending", "generating"]) {
    it(`[020/AC-1] says the report is being updated and keeps the old comparisons while it is ${status}`, async () => {
      answerWith(status, sample.skill_comparisons);

      renderPage();

      await waitFor(() => expect(screen.getByText(/being updated/i)).toBeTruthy());
      expect(screen.getByText("Ruby")).toBeTruthy();
      expect(keepsChecking()).toBe(true);
    });
  }

  it("[020/AC-2] shows the error and the previous comparisons of a failed report, and can regenerate it", async () => {
    answerWith("failed", sample.skill_comparisons, "model unavailable");

    renderPage();

    await waitFor(() => expect(screen.getByText(/model unavailable/)).toBeTruthy());
    expect(screen.getByText("Ruby")).toBeTruthy();
    expect((screen.getByRole("button", { name: /regenerate/i }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("[020/AC-3] shows the error and no table for a failed report that never had comparisons", async () => {
    answerWith("failed", [], "model unavailable");

    renderPage();

    await waitFor(() => expect(screen.getByText(/model unavailable/)).toBeTruthy());
    expect(screen.queryByText("Skill Comparison")).toBeNull();
  });

  it("[020/AC-4] shows a complete report with no notice and no error, and stops checking", async () => {
    answerWith("complete", sample.skill_comparisons);

    renderPage();

    await waitFor(() => expect(screen.getByText("Ruby")).toBeTruthy());
    expect(screen.queryByText(/being updated/i)).toBeNull();
    expect(screen.queryByText(/model unavailable/)).toBeNull();
    expect(keepsChecking()).toBe(false);
  });
});
