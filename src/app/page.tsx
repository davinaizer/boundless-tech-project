import { env } from "@/lib/env";
import { Finder } from "./_components/Finder";

export default function Home() {
  return <Finder maxQueryChars={env.MAX_QUERY_CHARS} />;
}
