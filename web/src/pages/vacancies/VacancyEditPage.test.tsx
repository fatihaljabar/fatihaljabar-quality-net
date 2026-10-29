import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import VacancyEditPage from "./VacancyEditPage";
import { vacanciesApi } from "@/services/vacancies";

// Spec 016 (AC-2, AC-5, AC-6). The vacancy service is a stand-in; the rejection is made by a plain function because this
// vitest version fails a test whose mock returned a rejected promise.
vi.mock("@/services/vacancies", () => ({ vacanciesApi: { get: vi.fn(), update: vi.fn() } }));

const service = vacanciesApi as unknown as { get: unknown };
const original = vacanciesApi.get;

function renderPage() {
  render(
    <MemoryRouter initialEntries={["/vacancies/18/edit"]}>
      <Routes>
        <Route path="/vacancies/:id/edit" element={<VacancyEditPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const failWith = (status: number) => {
  service.get = () => Promise.reject({ response: { status } });
};

describe("VacancyEditPage when it loads the vacancy", () => {
  beforeEach(() => {
    service.get = original;
  });
  afterEach(cleanup);

  it("[016/AC-2] shows the not found message and no edit form for a vacancy that does not exist", async () => {
    failWith(404);

    renderPage();

    await waitFor(() => expect(screen.getByText(/not found/i)).toBeTruthy());
    expect(screen.queryByText("Edit Vacancy")).toBeNull();
  });

  it("[016/AC-5] shows the permission message for a vacancy the user may not see", async () => {
    failWith(403);

    renderPage();

    await waitFor(() => expect(screen.getByText(/permission/i)).toBeTruthy());
    expect(screen.queryByText(/not found/i)).toBeNull();
  });

  it("[016/AC-6] shows the form with the values of a vacancy that exists", async () => {
    service.get = () =>
      Promise.resolve({
        data: {
          vacancy: { id: 18, role_title: "Backend Engineer", culture_dimensions: "", competency_expectations: "", skills: [] },
        },
      });

    renderPage();

    await waitFor(() => expect(screen.getByText("Edit Vacancy")).toBeTruthy());
    expect((screen.getByDisplayValue("Backend Engineer") as HTMLInputElement).value).toBe("Backend Engineer");
  });
});
