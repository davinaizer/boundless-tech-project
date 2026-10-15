import { execFileSync } from "node:child_process";
import type { NextConfig } from "next";
import { version } from "./package.json";

// `v<package>+<build>.<short sha>`, with the build number from the git commit
// count. If git is unavailable the whole build part is `dev`; the build never fails.
function appVersion(): string {
  const git = (...args: string[]) =>
    execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  try {
    const build = git("rev-list", "--count", "HEAD");
    const sha = git("rev-parse", "--short", "HEAD");
    return `v${version}+${build}.${sha}`;
  } catch {
    return `v${version}+dev`;
  }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: appVersion() },
  cacheComponents: true,
  partialPrefetching: true,
  // AGENTS.md is owned by this repository; stop `next dev` from rewriting it.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
