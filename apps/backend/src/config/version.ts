import fs from "node:fs";
import path from "node:path";

declare const __APP_VERSION__: string | undefined;

function resolveFallbackVersion(): string {
  const candidates = [
    path.resolve(process.cwd(), "../../package.json"),
    path.resolve(process.cwd(), "package.json"),
  ];

  for (const filePath of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as { version?: string };
      if (parsed.version) return parsed.version;
    } catch {
      // Fallback to next candidate path
    }
  }

  return "0.0.0";
}

export const APP_VERSION: string =
  typeof __APP_VERSION__ === "string" && __APP_VERSION__.length > 0
    ? __APP_VERSION__
    : resolveFallbackVersion();

export function getDeployCommit(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local";
}
