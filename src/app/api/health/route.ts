import { connection } from "next/server";
import { HealthResponse } from "@/domain/api";
import { APP_VERSION } from "@/lib/version";
import { describeRuntime } from "@/services/runtime-info";

export async function GET() {
  // Run per request, so a smoke test exercises the server rather than a
  // response prerendered at build time, and the provider and adapter reported
  // are the running server's, not the build's.
  await connection();
  return Response.json(
    HealthResponse.parse({
      status: "ok",
      version: APP_VERSION,
      ...describeRuntime(),
    }),
  );
}
