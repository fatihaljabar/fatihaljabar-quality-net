import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import PortfolioPage from "./PortfolioPage";
import { sessionsApi } from "@/services/sessions";

// Spec 021 (AC-3, AC-4). The services and the polling hook are stand-ins; the card of a stored skill is a stand-in too.
vi.mock("@/services/sessions", () => ({ sessionsApi: { getPortfolio: vi.fn(), get: vi.fn() } }));
vi.mock("@/services/vacancies", () => ({ vacanciesApi: { list: vi.fn(() => Promise.resolve({ data: { vacancies: [] } })) } }));
vi.mock("@/services/portfolios", () => ({ portfoliosApi: {} }));
vi.mock("@/hooks/usePolling", () => ({ usePolling: () => undefined }));
vi.mock("@/components/portfolio/SkillPortfolioCard", () => ({
  default: ({ skill }: { skill: { skill_label: string } }) => <div>stored: {skill.skill_label}</div>,
}));

function show(notAssessed: { skill_id: null; skill_label: string }[]) {
  const service = sessionsApi as unknown as { getPortfolio: unknown; get: unknown };
  service.getPortfolio = () =>
    Promise.resolve({
      data: {
        portfolio: {
          id: 5, session_id: 18, generation_status: "complete", overrides: [], not_assessed_skills: notAssessed,
          skills: [{ id: 1, skill_label: "Ruby", is_discovered: false, ai_level: 3, ai_confidence: "high", evidence: [] }],
        },
      },
    });
  service.get = () => Promise.resolve({ data: { session: { candidate_name: "Budi" } } });
  render(
    <MemoryRouter initialEntries={["/assessments/1/sessions/18/portfolio"]}>
      <Routes>
        <Route path="/assessments/:id/sessions/:sessionId/portfolio" element={<PortfolioPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe("PortfolioPage and the skills that were not assessed", () => {
  afterEach(cleanup);

  it("[021/AC-3] names the skills that were not assessed and says that no level is stated for them", async () => {
    show([{ skill_id: null, skill_label: "Testing" }, { skill_id: null, skill_label: "Design" }]);

    await waitFor(() => expect(screen.getByText(/not assessed/i)).toBeTruthy());
    expect(screen.getByText("Testing")).toBeTruthy();
    expect(screen.getByText("Design")).toBeTruthy();
    expect(screen.getByText(/no level is stated/i)).toBeTruthy();
  });

  it("[021/AC-4] shows no such section when every configured skill was assessed", async () => {
    show([]);

    await waitFor(() => expect(screen.getByText("stored: Ruby")).toBeTruthy());
    expect(screen.queryByText(/not assessed/i)).toBeNull();
  });
});
