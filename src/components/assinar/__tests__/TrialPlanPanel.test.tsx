import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { TrialPlanPanel } from "../TrialPlanPanel";

describe("TrialPlanPanel", () => {
  it("shows the monthly 7-day trial timeline when monthly is selected", () => {
    render(<TrialPlanPanel selectedPlan="monthly" onSelectPlan={vi.fn()} />);
    expect(screen.getAllByText(/Hoje/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Em 7 dias/i).length).toBeGreaterThan(0);
  });

  it("shows the annual immediate-charge timeline when annual is selected", () => {
    render(<TrialPlanPanel selectedPlan="annual" onSelectPlan={vi.fn()} />);
    expect(screen.getAllByText(/R\$ 142,80/).length).toBeGreaterThan(0);
    expect(screen.queryAllByText(/Em 7 dias/i).length).toBe(0);
  });

  it("calls onSelectPlan when a plan option is clicked", () => {
    const onSelectPlan = vi.fn();
    render(<TrialPlanPanel selectedPlan="monthly" onSelectPlan={onSelectPlan} />);
    fireEvent.click(screen.getByRole("button", { name: /anual/i }));
    expect(onSelectPlan).toHaveBeenCalledWith("annual");
  });
});
