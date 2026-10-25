import { connection } from "next/server";
import { getDebugEntry, isDebugEnabled } from "@/lib/debug-store";

// The development request inspector's server side (ADR-017). Outside development
// it answers 404 before reading anything, exactly as for an unknown ID.
export async function GET(_request: Request, { params }: RouteContext<"/api/debug/[requestId]">) {
  await connection();
  if (!isDebugEnabled()) return notFound();
  const entry = getDebugEntry((await params).requestId);
  return entry ? Response.json(entry) : notFound();
}

const notFound = () => new Response(null, { status: 404 });
