import { readFileSync } from "fs";
import path from "path";
import { extractNofoCriteria } from "../lib/extract-nofo";
import { matchProjects, scoreProject } from "../lib/matching";
import { parseProjectCsv } from "../lib/parse-projects";
import { SAMPLE_SS4A_NOFO, SAMPLE_BRIDGE_NOFO, SAMPLE_RAISE_NOFO } from "../lib/sample-nofo";
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
});
