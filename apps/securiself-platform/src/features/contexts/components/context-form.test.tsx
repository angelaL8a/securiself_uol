import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ContextForm } from "./context-form";

const CUE =
  /English and Spanish are language variants of this same Context\. Adding another language does not create a separate Context or permission\./;

describe("ContextForm language variants (Cohort A, A3)", () => {
  it("explains that EN/ES are variants of the same Context and names the localisable fields", () => {
    render(<ContextForm mode="create" onSubmit={vi.fn()} />);
    expect(
      screen.getByRole("region", { name: "Language variants" }),
    ).toBeInTheDocument();
    expect(screen.getByText(CUE)).toHaveTextContent(
      "Only pronouns, job title, and short bio have language variants",
    );
    expect(
      screen.getByRole("tablist", { name: "Language variant of this Context" }),
    ).toHaveAccessibleDescription(CUE);
    expect(screen.getByRole("tab", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Español" })).toBeInTheDocument();
  });

  it("does not show the cue for a category without localisable fields", () => {
    render(
      <ContextForm
        mode="edit"
        defaultValues={{ category: "LEGAL", internalName: "Legal" }}
        onSubmit={vi.fn()}
      />,
    );
    expect(
      screen.queryByRole("region", { name: "Language variants" }),
    ).not.toBeInTheDocument();
  });

  it("keeps both variants when switching and submits them as one Context", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(
      <ContextForm
        mode="edit"
        defaultValues={{
          category: "PROFESSIONAL",
          internalName: "Work",
          displayName: "Ada",
          jobTitle: "Engineer",
        }}
        onSubmit={onSubmit}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Español" }));
    await user.type(screen.getByLabelText("Job title"), "Ingeniera");
    await user.click(screen.getByRole("tab", { name: "English" }));
    expect(screen.getByLabelText("Job title")).toHaveValue("Engineer");
    await user.click(screen.getByRole("tab", { name: "Español" }));
    expect(screen.getByLabelText("Job title")).toHaveValue("Ingeniera");

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0]).toMatchObject({
      category: "PROFESSIONAL",
      internalName: "Work",
      jobTitle: "Engineer",
      jobTitleEs: "Ingeniera",
    });
  });
});
