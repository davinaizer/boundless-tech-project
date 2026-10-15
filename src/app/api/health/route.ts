import { connection } from "next/server";
import { APP_VERSION } from "@/lib/version";

export async function GET() {
  // Run per request, so a smoke test exercises the server rather than a
  // response prerendered at build time.
  await connection();
  return Response.json({ status: "ok", version: APP_VERSION });
}
