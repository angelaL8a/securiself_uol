import { rmSync } from "node:fs";
import path from "node:path";
import { ROOT } from "./load-e2e-env";

/** Clears Next.js caches so long suites do not reuse a corrupted Turbopack manifest. */
export function cleanNextCaches(): void {
  for (const app of ["securiself-platform", "prymecab-simulator"]) {
    const nextDir = path.join(ROOT, "apps", app, ".next");
    rmSync(nextDir, { recursive: true, force: true });
  }
}
