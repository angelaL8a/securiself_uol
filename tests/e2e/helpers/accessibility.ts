import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

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

/**
 * Scans the current page and fails on critical/serious violations.
 * Moderate and minor findings, and a per-scan summary, are attached to the
 * Playwright report rather than failing the test.
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
    await test.info().attach(`${label}-axe-advisory`, {
      body: summary,
      contentType: "text/plain",
    });
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
  await test.info().attach(`${label}-axe-summary`, {
    body: JSON.stringify(scanSummary, null, 2),
    contentType: "application/json",
  });

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

export async function expectFocusVisibleOn(
  page: Page,
  role: Parameters<Page["getByRole"]>[0],
  name: string | RegExp,
): Promise<void> {
  const control = page.getByRole(role, { name });
  await control.focus();
  await expect(control).toBeFocused();
}
