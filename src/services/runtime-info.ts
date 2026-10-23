import "server-only";
import { describeData } from "@/data";
import { describeAi } from "@/lib/ai";

// What the running server uses, for the request log and /api/health. A service so
// the Route Handlers reach the provider and the adapter only through this layer.
export function describeRuntime() {
  return { ai: describeAi(), data: describeData() };
}
