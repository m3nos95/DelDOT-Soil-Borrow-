import { readFileSync } from "fs";
import path from "path";
import { extractNofoCriteria } from "../lib/extract-nofo";
import { matchProjects, scoreProject } from "../lib/matching";
import { parseProjectCsv } from "../lib/parse-projects";
import { SAMPLE_SS4A_NOFO, SAMPLE_BRIDGE_NOFO, SAMPLE_RAISE_NOFO, SAMPLE_BUS_NOFO } from "../lib/sample-nofo";
import { getUnfundedProjects, TARGET_PROJECT_COUNT } from "../lib/sample-projects";
import { describe, expect, it } from "vitest";

describe("sample Unifier inventory", () => {
  it("builds a deterministic 248-project unfunded list", () => {
    const a = getUnfundedProjects();
    const b = getUnfundedProjects();
    expect(a).toHaveLength(TARGET_PROJECT_COUNT);
    expect(a[0]?.name).toBe("US 13 Intersection Safety Improvements");
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
  });

  it("parses the 15-project sample CSV", () => {
    const csv = readFileSync(path.join(process.cwd(), "public/samples/unfunded-projects-sample.csv"), "utf8");
    const projects = parseProjectCsv(csv);
    expect(projects).toHaveLength(15);
    expect(projects[0]?.unifierId).toBe("UNF-1001");
    expect(projects[0]?.name).toBe("US 13 Intersection Safety Improvements");
    expect(projects[0]?.crashHistory.highCrashLocation).toBe(true);
  });
});

describe("NOFO extraction", () => {
  it("detects SS4A and keeps safety priorities", () => {
    const criteria = extractNofoCriteria(SAMPLE_SS4A_NOFO, "ss4a.pdf");
    expect(criteria.programCode).toBe("SS4A");
    expect(criteria.programPriorities.join(" ")).toMatch(/roadway deaths/i);
    expect(criteria.evaluationCriteria.join(" ")).toMatch(/equity/i);
  });

  it("detects the Bridge Investment Program", () => {
    const criteria = extractNofoCriteria(SAMPLE_BRIDGE_NOFO, "bip.pdf");
    expect(criteria.programCode).toBe("BRIDGE");
  });

  it("does not treat an FTA bus Federal Register notice as INFRA", () => {
    const frNotice = `
FY 2026 Competitive Funding Opportunity: Grants for Buses and Bus
Facilities Infrastructure Programs
The Federal Transit Administration (FTA) announces the opportunity to apply for
$610 million in competitive grants for the Fiscal Year (FY) 2026 Grants for Buses
and Bus Facilities Program and Low or No Emission Grant Program.
The funding opportunity IDs are FTA-2026-010-TPM-BUS and FTA-2026-011-TPM-LWNO.
Authority: 49 U.S.C. 5339(b) and (c).
`;
    const criteria = extractNofoCriteria(frNotice, "2026-15090.pdf");
    expect(criteria.programCode).toBe("BUS");
    expect(criteria.programCode).not.toBe("INFRA");
  });
});

describe("matching engine", () => {
  it("ranks safety projects above pavement preservation for SS4A", () => {
    const projects = getUnfundedProjects();
    const criteria = extractNofoCriteria(SAMPLE_SS4A_NOFO, "ss4a.pdf");
    const matches = matchProjects(projects, criteria);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(80);
    const pavement = matches.find((m) => m.projectName.includes("Pavement Preservation"));
    const safety = matches.find((m) => m.projectName.includes("Intersection Safety"));
    expect(safety).toBeTruthy();
    expect(pavement).toBeTruthy();
    expect(safety!.score).toBeGreaterThan(pavement!.score);
  });

  it("applies Grant Manager reject feedback on later scoring", () => {
    const project = getUnfundedProjects()[0]!;
    const criteria = extractNofoCriteria(SAMPLE_SS4A_NOFO, "ss4a.pdf");
    const baseline = scoreProject(project, criteria);
    const penalized = scoreProject(project, criteria, [
      {
        id: "fb-1",
        type: "reject",
        projectId: project.id,
        projectName: project.name,
        reason: "Already funded from another source",
        createdAt: new Date().toISOString(),
      },
    ]);
    expect(penalized.score).toBeLessThan(baseline.score);
  });

  it("ranks complete-streets highly for RAISE", () => {
    const projects = getUnfundedProjects();
    const criteria = extractNofoCriteria(SAMPLE_RAISE_NOFO, "raise.pdf");
    const matches = matchProjects(projects, criteria);
    expect(matches[0]?.score).toBeGreaterThanOrEqual(70);
    expect(matches[0]?.projectName.toLowerCase()).toMatch(/complete streets|multimodal|transit|downtown/);
  });

  it("prefers bundled bridges for BIP", () => {
    const projects = getUnfundedProjects();
    const criteria = extractNofoCriteria(SAMPLE_BRIDGE_NOFO, "bridge.pdf");
    const matches = matchProjects(projects, criteria);
    expect(matches[0]?.projectName.toLowerCase()).toMatch(/bridge/);
  });

  it("ranks transit projects above highway interchanges for FTA bus grants", () => {
    const projects = getUnfundedProjects();
    const criteria = extractNofoCriteria(SAMPLE_BUS_NOFO, "bus.pdf");
    expect(criteria.programCode).toBe("BUS");
    const matches = matchProjects(projects, criteria);
    const fleet = matches.find((m) => /bus fleet|low-no|maintenance facility/i.test(m.projectName));
    const interchange = matches.find((m) => m.projectName.includes("Interchange"));
    expect(fleet).toBeTruthy();
    expect(interchange).toBeTruthy();
    expect(fleet!.score).toBeGreaterThan(interchange!.score);
    expect(fleet!.recommended).toBe(true);
    expect(fleet!.fitBand).toBe("eligible");
  });

  it("does not let crash or equity promote the wrong project type for FTA bus grants", () => {
    const matches = matchProjects(getUnfundedProjects(), extractNofoCriteria(SAMPLE_BUS_NOFO, "bus.pdf"));
    const downtown = matches.find((m) => m.projectName === "Georgetown Downtown Multimodal Safety Project");
    const wilmington = matches.find((m) => m.projectName === "Wilmington High-Injury Network Complete Streets");
    const tsp = matches.find((m) => m.projectName === "Dover Transit Signal Priority and Queue Jump");
    const intersection = matches.find((m) => m.projectName === "US 13 Intersection Safety Improvements");

    expect(downtown?.fitBand).toBe("ineligible");
    expect(downtown?.score).toBeLessThanOrEqual(28);
    expect(downtown?.recommended).toBe(false);
    expect(downtown?.whyItQualifies).toMatch(/not eligible/i);
    expect(downtown?.whyItQualifies).not.toMatch(/crash|fatal|equity/i);

    expect(wilmington?.fitBand).toBe("ineligible");
    expect(wilmington?.score).toBeLessThanOrEqual(28);
    expect(wilmington?.recommended).toBe(false);
    expect(wilmington?.whyItQualifies).toMatch(/not eligible/i);

    expect(tsp?.fitBand).toBe("adjacent");
    expect(tsp?.score).toBeLessThanOrEqual(55);
    expect(tsp?.recommended).toBe(false);

    expect(intersection?.fitBand).toBe("ineligible");
    expect(intersection?.recommended).toBe(false);

    for (const m of matches.filter((row) => row.recommended)) {
      expect(m.fitBand).toBe("eligible");
      expect(m.projectName).toMatch(/bus|fleet|garage|low-?no|charging|facilit/i);
      expect(m.projectName).not.toMatch(/complete streets|interchange|intersection safety|bicycle boulevard/i);
    }
  });
});
