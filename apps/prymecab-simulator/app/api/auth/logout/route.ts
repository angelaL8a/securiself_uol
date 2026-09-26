import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete("accessToken");
  return Response.json({ status: "success" });
}
