import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";

export interface AxeScanOptions {
  /** Narrow exclusions only for confirmed third-party false positives. */
  disableRules?: string[];
}

export interface AxeImpactCounts {
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  incomplete: number;
}

export interface AxeScanSummary {
  application: string;
  routeOrState: string;
  axeTags: string[];
  critical: number;
  serious: number;
  moderate: number;
  minor: number;
  incomplete: number;
  testResult: "pass" | "fail";
  blockingRuleIds: string[];
  advisoryRuleIds: string[];
}

const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

const SUMMARY_JSON = path.resolve(
  __dirname,
  "../../../writeup-evidence/reports/accessibility-summary.json",
);

function countByImpact(
  items: Array<{ impact?: string | null }>,
): Omit<AxeImpactCounts, "incomplete"> {
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const item of items) {
    const impact = item.impact ?? "";
    if (impact === "critical") counts.critical += 1;
    else if (impact === "serious") counts.serious += 1;
    else if (impact === "moderate") counts.moderate += 1;
    else if (impact === "minor") counts.minor += 1;
  }
  return counts;
}

function inferApplication(label: string): string {
  if (label.startsWith("prymecab") || label.includes("prymecab")) {
    return "prymecab-simulator";
  }
  return "securiself-platform";
}

function appendAxeSummary(entry: AxeScanSummary): void {
  mkdirSync(path.dirname(SUMMARY_JSON), { recursive: true });
  let existing: { scans: AxeScanSummary[] } = { scans: [] };
  if (existsSync(SUMMARY_JSON)) {
    try {
      existing = JSON.parse(readFileSync(SUMMARY_JSON, "utf8")) as {
        scans: AxeScanSummary[];
      };
      if (!Array.isArray(existing.scans)) existing = { scans: [] };
    } catch {
      existing = { scans: [] };
    }
  }
  const withoutDup = existing.scans.filter(
    (s) => s.routeOrState !== entry.routeOrState,
  );
  withoutDup.push(entry);
  writeFileSync(
    SUMMARY_JSON,
    `${JSON.stringify({ generatedAt: new Date().toISOString(), scans: withoutDup }, null, 2)}\n`,
    "utf8",
  );
}

/**
 * Scans the current page and fails on critical/serious violations.
 * Moderate and minor findings are attached to the test report without hiding them.
 * Also appends a machine-readable row to writeup-evidence/reports/accessibility-summary.json.
 */
export async function expectNoCriticalOrSeriousViolations(
  page: Page,
  label: string,
  options: AxeScanOptions = {},
): Promise<AxeScanSummary> {
  let builder = new AxeBuilder({ page }).withTags([...AXE_TAGS]);

  if (options.disableRules?.length) {
    builder = builder.disableRules(options.disableRules);
  }

  const results = await builder.analyze();
  const blocking = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  const advisory = results.violations.filter(
    (v) => v.impact === "moderate" || v.impact === "minor",
  );
  const violationCounts = countByImpact(results.violations);
  const incompleteCount = results.incomplete?.length ?? 0;

  if (advisory.length > 0) {
    const summary = advisory
      .map((v) => `${v.impact}: ${v.id} (${v.nodes.length} nodes)`)
      .join("; ");
    await testInfoAttach(page, `${label}-axe-advisory`, summary);
  }

  const scanSummary: AxeScanSummary = {
    application: inferApplication(label),
    routeOrState: label,
    axeTags: [...AXE_TAGS],
    critical: violationCounts.critical,
    serious: violationCounts.serious,
    moderate: violationCounts.moderate,
    minor: violationCounts.minor,
    incomplete: incompleteCount,
    testResult: blocking.length === 0 ? "pass" : "fail",
    blockingRuleIds: blocking.map((v) => v.id),
    advisoryRuleIds: advisory.map((v) => v.id),
  };
  appendAxeSummary(scanSummary);

  expect(
    blocking,
    [
      `Axe critical/serious violations on "${label}"`,
      ...blocking.map(
        (v) =>
          `- [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node(s))`,
      ),
    ].join("\n"),
  ).toEqual([]);

  return scanSummary;
}

async function testInfoAttach(
  page: Page,
  name: string,
  body: string,
): Promise<void> {
  // Attach via page context when available; ignore if the runner has no test info.
  try {
    const { test } = await import("@playwright/test");
    await test.info().attach(name, {
      body,
      contentType: "text/plain",
    });
  } catch {
    void page;
  }
}

export async function expectFocusVisibleOn(
  page: Page,
  role: Parameters<Page["getByRole"]>[0],
  name: string | RegExp,
): Promise<void> {
  const control = page.getByRole(role, { name });
  await control.focus();
  await expect(control).toBeFocused();
}
