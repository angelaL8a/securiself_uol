import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GrantsPage } from "./grants-page";

const useGrants = vi.fn();

vi.mock("../hooks", () => ({
  useGrants: () => useGrants(),
}));

vi.mock("./grants-list", () => ({
  GrantsList: () => <div>Grants list</div>,
}));

describe("GrantsPage states", () => {
  it("shows loading state", () => {
    useGrants.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<GrantsPage />);
    expect(screen.getByRole("heading", { name: "Grants" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute("aria-busy", "true");
  });

  it("shows empty state", () => {
    useGrants.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<GrantsPage />);
    expect(screen.getByText("No grants yet")).toBeInTheDocument();
  });

  it("shows error state with retry", () => {
    useGrants.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("Network down"),
      refetch: vi.fn(),
    });
    render(<GrantsPage />);
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("describes Grants as current access and links to Activity history", () => {
    useGrants.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    render(<GrantsPage />);
    expect(
      screen.getByText(/^Current permissions: the applications that can access/),
    ).toHaveTextContent(/recorded in Activity\.$/);
    expect(screen.getByRole("link", { name: "View Activity" })).toHaveAttribute(
      "href",
      "/console/activity",
    );
  });
});
