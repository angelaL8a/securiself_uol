import { afterEach, describe, expect, it } from "vitest";
import { env } from "../src/config/env";
import { ApiError } from "../src/lib/errors";
import { verifyGoogleIdToken } from "../src/lib/googleIdToken";

const original = env.GOOGLE_CLIENT_ID;

afterEach(() => {
  env.GOOGLE_CLIENT_ID = original;
});

/** Exercises the REAL verifier (no mock) rather than the route-level stub. */
describe("verifyGoogleIdToken", () => {
  it("reports 503 when no Google client ID is configured", async () => {
    env.GOOGLE_CLIENT_ID = undefined;

    await expect(verifyGoogleIdToken("anything")).rejects.toMatchObject({
      status: 503,
    });
  });

  it("rejects a credential that is not a Google-signed ID token", async () => {
    env.GOOGLE_CLIENT_ID = "test-client.apps.googleusercontent.com";

    const error = await verifyGoogleIdToken("not.a.jwt").catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(401);
  });
});
