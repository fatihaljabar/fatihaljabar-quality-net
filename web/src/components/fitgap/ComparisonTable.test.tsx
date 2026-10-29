import { afterEach, describe, it, expect } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import ComparisonTable from "./ComparisonTable";
import type { SkillComparison } from "@/types";
import sample from "../../../../contracts/fit-gap-report.json";

// Specs 010 (AC-2, AC-3). The sample is the agreement with the API; the API side is checked in api/spec/contracts.
const comparisons = sample.skill_comparisons as unknown as SkillComparison[];

const rowOf = (label: string) => screen.getByText(label).closest("tr") as HTMLElement;

describe("ComparisonTable on the shared fit/gap sample", () => {
  afterEach(cleanup);

  it("[010/AC-2] shows the required level, the candidate level and the result of every row", () => {
    render(<ComparisonTable comparisons={comparisons} />);

    const [ruby, testing, design] = ["Ruby", "Testing", "Design"].map((l) => within(rowOf(l)).getAllByRole("cell"));
    expect(ruby[1].textContent).toBe("L3");
    expect(ruby[2].textContent).toContain("L4");
    expect(ruby[3].textContent).toContain("Exceeds");
    expect(testing[1].textContent).toBe("L3");
    expect(testing[2].textContent).toContain("L2");
    expect(testing[3].textContent).toContain("Gap");
    expect(design[1].textContent).toBe("L3");
    expect(design[2].textContent).toBe("—");
  });

  it("[010/AC-3] marks only the overridden row", () => {
    render(<ComparisonTable comparisons={comparisons} />);

    expect(within(rowOf("Ruby")).getAllByRole("cell")[2].textContent).toContain("✏");
    expect(within(rowOf("Testing")).getAllByRole("cell")[2].textContent).not.toContain("✏");
    expect(within(rowOf("Design")).getAllByRole("cell")[2].textContent).not.toContain("✏");
  });
});
