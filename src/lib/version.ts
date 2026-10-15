import { env } from "@/lib/env";

// `v<package>+<build>.<short sha>`, computed at build time in next.config.ts.
export const APP_VERSION: string = env.NEXT_PUBLIC_APP_VERSION;
