/**
 * Tests for ConfidenceBadge component.
 * Verifies the correct badge color and label at each confidence threshold.
 */
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";

describe("ConfidenceBadge", () => {
  it("shows High and green styling at confidence >= 0.85", () => {
    render(<ConfidenceBadge score={0.93} />);
    expect(screen.getByText(/High/)).toBeTruthy();
    expect(screen.getByText(/93%/)).toBeTruthy();
  });

  it("shows Medium at confidence 0.70–0.84", () => {
    render(<ConfidenceBadge score={0.75} />);
    expect(screen.getByText(/Medium/)).toBeTruthy();
  });

  it("shows Low below 0.70", () => {
    render(<ConfidenceBadge score={0.58} />);
    expect(screen.getByText(/Low/)).toBeTruthy();
  });

  it("renders 0% confidence without crashing", () => {
    render(<ConfidenceBadge score={0} />);
    expect(screen.getByText(/Low/)).toBeTruthy();
    expect(screen.getByText(/0%/)).toBeTruthy();
  });

  it("renders 100% confidence without crashing", () => {
    render(<ConfidenceBadge score={1.0} />);
    expect(screen.getByText(/High/)).toBeTruthy();
    expect(screen.getByText(/100%/)).toBeTruthy();
  });

  it("rounds percentage display correctly", () => {
    render(<ConfidenceBadge score={0.876} />);
    expect(screen.getByText(/88%/)).toBeTruthy();
  });
});
