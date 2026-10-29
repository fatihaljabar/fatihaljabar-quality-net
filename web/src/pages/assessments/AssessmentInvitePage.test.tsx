import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AssessmentInvitePage from "./AssessmentInvitePage";
import { assessmentsApi } from "@/services/assessments";

// Spec 016 (AC-4). The assessment service is a stand-in whose rejection is made by a plain function.
vi.mock("@/services/assessments", () => ({
  assessmentsApi: { get: vi.fn(), getSessions: vi.fn(), createSession: vi.fn() },
}));

describe("AssessmentInvitePage when it loads the assessment", () => {
  afterEach(cleanup);

  it("[016/AC-4] shows the not found message and no invite button for an assessment that does not exist", async () => {
    const service = assessmentsApi as unknown as { get: unknown; getSessions: unknown };
    service.get = () => Promise.reject({ response: { status: 404 } });
    service.getSessions = () => Promise.reject({ response: { status: 404 } });

    render(
      <MemoryRouter initialEntries={["/assessments/18/invite"]}>
        <Routes>
          <Route path="/assessments/:id/invite" element={<AssessmentInvitePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Invite Candidate")).toBeNull();
  });
});
