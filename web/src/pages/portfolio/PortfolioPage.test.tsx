import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PortfolioPage from "./PortfolioPage";
import { sessionsApi } from "@/services/sessions";

// Spec 017 (AC-2, AC-5). The services and the polling hook are stand-ins; rejections come from plain functions.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getPortfolio: vi.fn(), get: vi.fn() } }));
vi.mock("@/services/vacancies", () => ({ vacanciesApi: { list: vi.fn(() => Promise.resolve({ data: { vacancies: [] } })) } }));
vi.mock("@/services/portfolios", () => ({ portfoliosApi: {} }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: () => undefined }));

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/assessments/1/sessions/18/portfolio"]}>
      <Routes>
        <Route path="/assessments/:id/sessions/:sessionId/portfolio" element={<PortfolioPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const failWith = (status: number) => {
  const service = sessionsApi as unknown as { getPortfolio: unknown; get: unknown };
  service.getPortfolio = () => Promise.reject({ response: { status } });
  service.get = () => Promise.reject({ response: { status } });
};

describe("PortfolioPage when it loads the session", () => {
  afterEach(cleanup);

  it("[017/AC-2] shows the not found message and not the portfolio page for a session that does not exist", async () => {
    failWith(404);

    renderPage();

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Portfolio Results")).toBeNull();
  });

  it("[017/AC-5] shows the permission message for a session the user may not see", async () => {
    failWith(403);

    renderPage();

    await waitFor(() => expect(screen.getByText(/permission/i)).toBeTruthy());
    expect(screen.queryByText(/not found/i)).toBeNull();
  });
});
