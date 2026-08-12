/**
 * Guardrails for draft salary pricing.
 * Run: npx tsx scripts/test-salaries.ts
 */
import { salaryFromValue } from "./recompute-salaries";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function near(actual: number, expected: number, tol = 300_000) {
  assert(
    Math.abs(actual - expected) <= tol,
    `expected ~${expected}, got ${actual}`,
  );
}

// Cup-of-coffee: must be near floor
assert(salaryFromValue(0.2, 4, false) <= 800_000, "4 PA bat too expensive");
assert(salaryFromValue(0.3, 5, true) <= 800_000, "5 IP arm too expensive");
assert(salaryFromValue(1.0, 50, false) <= 1_500_000, "50 PA bat too expensive");

// Real careers still priced as stars / solid vets
assert(salaryFromValue(67, 8664, false) >= 18_000_000, "Andruw underpriced");
assert(salaryFromValue(162.8, 12606, false) >= 30_000_000, "Bonds underpriced");
assert(salaryFromValue(104, 5000, true) >= 18_000_000, "Maddux underpriced");

// Short but real peak still worth a mid-tier starter salary
assert(salaryFromValue(8, 650, false) >= 10_000_000, "1-season star too cheap");
assert(salaryFromValue(8, 650, false) <= 16_000_000, "1-season star too rich");

// Compiler vs peak: Baines bulk shouldn't crush Hafner peak entirely
const baines = salaryFromValue(49, 11000, false);
const hafner = salaryFromValue(24, 4200, false);
assert(hafner >= 8_000_000, "Hafner-ish peak too cheap");
assert(baines >= hafner - 4_000_000, "compiler collapsed vs peak");

near(salaryFromValue(0.2, 4, false), 500_000, 100_000);

console.log("salary tests OK");
