import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ConsentNotShared } from "./consent-not-shared";

function items() {
  const region = screen.getByRole("region", { name: "Not shared with PrymeCab" });
  return within(region)
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

describe("ConsentNotShared", () => {
  it("names excluded information for the selected Context as a labelled region", () => {
    render(<ConsentNotShared applicationName="PrymeCab" category="SOCIAL" />);
    expect(items()).toEqual([
      "Legal name",
      "Document ID",
      "Account email",
      "Gender",
      "Your other Contexts",
    ]);
    expect(
      screen.getByText(/Only the fields in the preview above are shared/i),
    ).toBeInTheDocument();
  });

  it("updates when the selected Context category changes", () => {
    const { rerender } = render(
      <ConsentNotShared applicationName="PrymeCab" category="SOCIAL" />,
    );
    rerender(<ConsentNotShared applicationName="PrymeCab" category="LEGAL" />);
    expect(items()).toEqual(["Account email", "Gender", "Your other Contexts"]);
  });

  it("renders labels only, never an email or other identity value", () => {
    const { container } = render(
      <ConsentNotShared applicationName="PrymeCab" category="PRIVATE" />,
    );
    expect(container.textContent).not.toMatch(/@/);
  });
});
