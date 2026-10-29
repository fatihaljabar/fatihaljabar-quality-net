import { afterEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import AssessmentEditPage from "./AssessmentEditPage";
import { assessmentsApi } from "@/services/assessments";

// Spec 016 (AC-3). The assessment service is a stand-in whose rejection is made by a plain function.
vi.mock("@/services/assessments", () => ({ assessmentsApi: { get: vi.fn(), update: vi.fn() } }));

describe("AssessmentEditPage when it loads the assessment", () => {
  afterEach(cleanup);

  it("[016/AC-3] shows the not found message and no edit form for an assessment that does not exist", async () => {
    (assessmentsApi as unknown as { get: unknown }).get = () => Promise.reject({ response: { status: 404 } });

    render(
      <MemoryRouter initialEntries={["/assessments/18/edit"]}>
        <Routes>
          <Route path="/assessments/:id/edit" element={<AssessmentEditPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Edit Assessment")).toBeNull();
  });
});
