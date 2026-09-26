import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    redirect("/?error=missing_code");
  }

  const res = await fetch(`${API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.NEXT_PUBLIC_CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      redirect_uri: process.env.NEXT_PUBLIC_REDIRECT_URI,
    }),
  });

  if (!res.ok) {
    redirect("/?error=token_exchange_failed");
  }

  const body = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!body.access_token) {
    redirect("/?error=token_exchange_failed");
  }

  const cookieStore = await cookies();
  cookieStore.set("accessToken", body.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: body.expires_in,
  });

  redirect("/");
}
