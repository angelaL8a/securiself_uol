import { cookies } from "next/headers";
import { profilesMeHeaders } from "../../../lib/profiles-me-headers";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("accessToken")?.value;
  if (!accessToken) {
    return Response.json(
      { status: "error", reason: "missing_token" },
      { status: 401 },
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/profiles/me`, {
    headers: profilesMeHeaders(
      accessToken,
      request.headers.get("accept-language"),
    ),
  });

  if (!response.ok) {
    // Keep the cookie so reloads still surface access-lost; logout/login clears it.
    return Response.json(
      { status: "error", reason: "access_rejected" },
      { status: 401 },
    );
  }

  const data = await response.json();
  return Response.json(data);
}
