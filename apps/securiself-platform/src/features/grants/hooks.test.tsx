import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/query-keys";
import { useRevokeGrant } from "./hooks";

const revokeGrant = vi.fn();

vi.mock("./api", () => ({
  fetchGrants: vi.fn(),
  revokeGrant: (...args: unknown[]) => revokeGrant(...args),
}));

describe("useRevokeGrant", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("invalidates Grants and Activity queries after success", async () => {
    revokeGrant.mockResolvedValue(undefined);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useRevokeGrant(), { wrapper });
    result.current.mutate("grant-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.grants.all,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.audit.list,
    });
  });
});
