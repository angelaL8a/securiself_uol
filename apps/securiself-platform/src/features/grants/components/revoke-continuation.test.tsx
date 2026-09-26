import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RevokeContinuation } from "./revoke-continuation";

describe("RevokeContinuation", () => {
  it("shows Activity action, PrymeCab guidance, and uses the Activity route", () => {
    render(
      <RevokeContinuation
        applicationName="PrymeCab"
        contextLabel="AngelaTech"
      />,
    );

    expect(screen.getByTestId("revoke-continuation")).toBeInTheDocument();
    expect(
      screen.getByText(/check PrymeCab to confirm/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Access for PrymeCab to the AngelaTech Context/i),
    ).toBeInTheDocument();

    const activity = screen.getByRole("link", { name: "View Activity" });
    expect(activity).toHaveAttribute("href", "/console/activity");
    expect(activity).toHaveAttribute(
      "data-testid",
      "revoke-continuation-activity",
    );
  });

  it("keeps the Activity action keyboard-operable", async () => {
    const user = userEvent.setup();
    render(
      <RevokeContinuation
        applicationName="PrymeCab"
        contextLabel="AngelaTech"
      />,
    );

    await user.tab();
    expect(screen.getByRole("link", { name: "View Activity" })).toHaveFocus();
  });
});
