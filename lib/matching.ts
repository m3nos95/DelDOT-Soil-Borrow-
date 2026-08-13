import { HISTORIC_AWARDS } from "./historic";
import type { Analysis, Feedback, MatchResult, NofoCriteria, Project, ScoreBreakdown } from "./types";
import { clamp } from "./utils";

const WEIGHTS = {
  eligibility: 0.3,
  evaluation: 0.25,
  priorities: 0.2,
  fundingObjectives: 0.15,
  historic: 0.1,
};

const CATEGORY_PROGRAM: Record<string, string[]> = {
  SS4A: ["safety", "bike-ped", "complete-streets", "signals", "planning", "transit"],
  RAISE: ["complete-streets", "transit", "bike-ped", "bridge", "freight", "safety"],
  BRIDGE: ["bridge"],
  PROTECT: ["resilience"],
  INFRA: ["freight", "safety"],
  CFI: ["ev-charging"],
  BUS: ["transit", "ev-charging", "signals"],
  CUSTOM: [],
};

const SYNONYMS: Record<string, string[]> = {
  death: ["fatality", "fatalities", "killed"],
  fatalities: ["death", "fatal"],
  injury: ["injuries", "serious", "crash"],
  pedestrian: ["ped", "vru", "sidewalk", "crossing", "walk"],
  bicycle: ["bike", "bicyclist", "vru"],
  safety: ["crash", "fatality", "countermeasure", "systemic"],
  equity: ["disadvantaged", "underserved", "justice40", "ej"],
  intersection: ["signal", "crossing"],
  lighting: ["light", "illumination"],
  resilience: ["flood", "coastal", "storm", "evacuation"],
  bridge: ["structurally", "deficient", "scour", "deck"],
  charging: ["ev", "electric", "alternative"],
  freight: ["truck", "bottleneck", "goods"],
};

function tokenize(...parts: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const part of parts) {
    for (const raw of part.toLowerCase().split(/[^a-z0-9+]+/)) {
      if (raw.length < 3) continue;
      tokens.add(raw);
      if (raw.endsWith("s") && raw.length > 4) tokens.add(raw.slice(0, -1));
      for (const extra of SYNONYMS[raw] ?? []) tokens.add(extra);
    }
  }
  return tokens;
}

function keywordHits(tokens: Set<string>, phrases: string[]): number {
  if (!phrases.length) return 0;
  let hits = 0;
  for (const phrase of phrases) {
    const words = [...tokenize(phrase)].filter((w) => w.length > 3);
    if (!words.length) continue;
    const matched = words.filter((w) => tokens.has(w)).length;
    hits += matched / words.length;
  }
  return hits / phrases.length;
}

function projectTokens(project: Project): Set<string> {
  return tokenize(
    project.name,
    project.description,
    project.category,
    project.corridor,
    project.county,
    project.readiness,
    ...project.modes,
    ...project.tags,
    project.equity.disadvantagedCommunity ? "equity disadvantaged underserved environmental justice" : "",
    project.equity.rural ? "rural" : "",
    project.crashHistory.highCrashLocation ? "high-crash fatality injury safety death" : "",
  );
}

function typeFit(project: Project, criteria: NofoCriteria): number {
  const favored = CATEGORY_PROGRAM[criteria.programCode] ?? [];
  if (!favored.length) return 0.55;
  if (favored.includes(project.category)) return 1;
  if (favored.some((c) => project.tags.includes(c))) return 0.7;
  return 0.25;
}

function eligibilityScore(project: Project, criteria: NofoCriteria, tokens: Set<string>): number {
  const fit = typeFit(project, criteria);
  let score = 38 + fit * 40 + keywordHits(tokens, [...criteria.eligibleProjectTypes, ...criteria.keywords]) * 16;
  if (criteria.awardRange) {
    const { min = 0, max = Number.POSITIVE_INFINITY } = criteria.awardRange;
    if (project.unfundedAmount >= min && project.unfundedAmount <= max * 1.4) score += 8;
    else if (project.unfundedAmount > max * 2.5) score -= 18;
    else if (project.unfundedAmount < min * 0.4) score -= 8;
  }
  if (project.readiness === "construction-ready" || project.readiness === "final-design") score += 6;
  if (project.readiness === "planning" && criteria.programCode !== "SS4A" && criteria.programCode !== "RAISE") {
    score -= 10;
  }
  return clamp(score);
}

function evaluationScore(project: Project, criteria: NofoCriteria, tokens: Set<string>): number {
  let score = 32 + keywordHits(tokens, criteria.evaluationCriteria) * 20;
  const safetyProgram = criteria.programCode === "SS4A" || /safety/i.test(criteria.programName);
  if (safetyProgram) {
    score += Math.min(28, project.crashHistory.fatalities5yr * 4 + project.crashHistory.seriousInjuries5yr * 0.35);
    if (project.crashHistory.highCrashLocation) score += 12;
  }
  if (criteria.evaluationCriteria.some((c) => /equity|underserved|justice/i.test(c))) {
    if (project.equity.disadvantagedCommunity) score += 10;
    if (project.equity.environmentalJustice) score += 5;
  }
  if (criteria.evaluationCriteria.some((c) => /readiness|schedule/i.test(c))) {
    score += project.designPercent / 10;
  }
  if (criteria.programCode === "BRIDGE" && project.category === "bridge") score += 22;
  if (criteria.programCode === "PROTECT" && project.tags.some((t) => /flood|coastal|evac/i.test(t))) score += 18;
  if (criteria.programCode === "CFI" && project.category === "ev-charging") score += 22;
  if (criteria.programCode === "BUS") {
    if (project.category === "transit" || project.tags.includes("transit") || project.modes.includes("transit")) {
      score += 22;
    }
    if (project.category === "ev-charging") score += 8;
  }
  if (criteria.programCode === "RAISE") {
    if (["complete-streets", "transit", "bike-ped"].includes(project.category)) score += 20;
    if (project.equity.disadvantagedCommunity) score += 8;
    if (project.modes.length >= 3) score += 8;
  }
  if (criteria.programCode === "INFRA" && (project.category === "freight" || project.tags.includes("interstate"))) {
    score += 18;
  }
  score *= 0.55 + 0.45 * typeFit(project, criteria);
  return clamp(score);
}

function priorityScore(project: Project, criteria: NofoCriteria, tokens: Set<string>): number {
  let score = 30 + keywordHits(tokens, [...criteria.programPriorities, ...criteria.keywords]) * 28;
  const blob = criteria.programPriorities.join(" ").toLowerCase();
  if ((blob.includes("vulnerable") || blob.includes("pedestrian")) && project.modes.some((m) => /pedestrian|bicycle/.test(m))) {
    score += 14;
  }
  if (blob.includes("rural") && project.equity.rural) score += 10;
  if (blob.includes("complete") && (project.category === "complete-streets" || project.tags.includes("complete-streets"))) {
    score += 12;
  }
  if (blob.includes("data-driven") && (project.category === "planning" || project.crashHistory.highCrashLocation)) {
    score += 10;
  }
  if (blob.includes("death") || blob.includes("fatal")) {
    score += Math.min(16, project.crashHistory.fatalities5yr * 3);
  }
  score *= 0.6 + 0.4 * typeFit(project, criteria);
  return clamp(score);
}

function fundingScore(project: Project, criteria: NofoCriteria, tokens: Set<string>): number {
  let score = 42 + keywordHits(tokens, criteria.fundingObjectives) * 18;
  const blob = criteria.fundingObjectives.join(" ").toLowerCase();
  if (blob.includes("implementation") && project.designPercent >= 60) score += 16;
  if (blob.includes("planning") && project.category === "planning") score += 18;
  if (blob.includes("construction") && project.readiness === "construction-ready") score += 10;
  if (typeFit(project, criteria) < 0.4) score -= 18;
  return clamp(score);
}

function historicScore(project: Project, criteria: NofoCriteria, feedbackBoost = 0): number {
  const related = HISTORIC_AWARDS.filter(
    (h) => h.programCode === criteria.programCode || h.category === project.category,
  );
  if (!related.length) return clamp(52 + feedbackBoost);
  let score = 48;
  for (const h of related) {
    const tagHits = h.tags.filter((t) => project.tags.includes(t) || project.category === h.category).length;
    const delta = Math.min(18, tagHits * 6);
    score += h.outcome === "awarded" ? delta : -delta * 0.6;
  }
  return clamp(score + feedbackBoost);
}

function feedbackBoostFor(project: Project, feedback: Feedback[]): number {
  let boost = 0;
  for (const item of feedback) {
    const same = item.projectId === project.id;
    const similar =
      item.projectName &&
      project.name.toLowerCase().includes(item.projectName.toLowerCase().slice(0, 12));
    if (item.type === "reject" && (same || similar)) boost -= 14;
    if (item.type === "add" && (same || similar)) boost += 12;
    if (item.type === "correct") boost += 2;
  }
  return boost;
}

function explain(project: Project, criteria: NofoCriteria, breakdown: ScoreBreakdown): {
  why: string;
  strengths: string[];
  gaps: string[];
} {
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (project.crashHistory.highCrashLocation) {
    strengths.push(
      `High-crash location: ${project.crashHistory.fatalities5yr} fatalities and ${project.crashHistory.seriousInjuries5yr} serious injuries in 5 years`,
    );
  }
  if (project.equity.disadvantagedCommunity) {
    strengths.push("Serves a disadvantaged / underserved community (equity criterion)");
  }
  if (project.designPercent >= 70) {
    strengths.push(`Strong readiness (${project.designPercent}% design, ${project.readiness.replace("-", " ")})`);
  }
  if (project.modes.includes("pedestrian") || project.modes.includes("bicycle")) {
    strengths.push("Includes vulnerable road user accommodations");
  }
  if (project.category === "planning" && criteria.programCode === "SS4A") {
    strengths.push("Aligns with SS4A planning / supplemental planning pathway");
  }
  if (project.category === "bridge" && criteria.programCode === "BRIDGE") {
    strengths.push("Directly addresses structurally deficient / load-posted bridge needs");
  }
  if (project.tags.includes("complete-streets") || project.category === "complete-streets") {
    strengths.push("Complete Streets elements match program priorities");
  }
  if (project.equity.rural && /rural/i.test([...criteria.programPriorities, ...criteria.evaluationCriteria].join(" "))) {
    strengths.push("Rural location supports geographic diversity / rural set-aside");
  }

  if (!project.crashHistory.highCrashLocation && (criteria.programCode === "SS4A" || /safety/i.test(criteria.programName))) {
    gaps.push("Limited documented fatal/serious crash history compared with top safety candidates");
  }
  if (project.designPercent < 40 && !/planning/i.test(criteria.fundingObjectives.join(" "))) {
    gaps.push("Early design stage may weaken the readiness criterion");
  }
  if (criteria.awardRange?.max && project.unfundedAmount > criteria.awardRange.max * 1.5) {
    gaps.push("Requested amount is large relative to typical award range — consider phasing");
  }
  if (!project.equity.disadvantagedCommunity && criteria.evaluationCriteria.some((c) => /equity/i.test(c))) {
    gaps.push("Equity narrative is weaker than competing projects in Justice40 / underserved areas");
  }
  if (
    (CATEGORY_PROGRAM[criteria.programCode] ?? []).length &&
    !(CATEGORY_PROGRAM[criteria.programCode] ?? []).includes(project.category)
  ) {
    gaps.push(`Project type (${project.category}) is not a primary fit for ${criteria.programCode}`);
  }

  const lead =
    strengths[0] ??
    `Partial alignment with ${criteria.programName} based on project description and Unifier attributes`;
  const extra = strengths.slice(1, 3).join("; ");
  const why = extra ? `${lead.replace(/\.$/, "")}; ${extra.toLowerCase()}.` : `${lead.replace(/\.$/, "")}.`;

  if (!strengths.length && breakdown.eligibility < 55) {
    return {
      why: `Limited alignment with ${criteria.programName} eligibility and priorities.`,
      strengths,
      gaps: gaps.length ? gaps : ["Does not clearly address extracted NOFO requirements"],
    };
  }

  return { why, strengths: strengths.slice(0, 4), gaps: gaps.slice(0, 3) };
}

export function scoreProject(
  project: Project,
  criteria: NofoCriteria,
  priorFeedback: Feedback[] = [],
): Omit<MatchResult, "rank" | "recommended"> {
  const tokens = projectTokens(project);
  const boost = feedbackBoostFor(project, priorFeedback);
  const breakdown: ScoreBreakdown = {
    eligibility: eligibilityScore(project, criteria, tokens),
    evaluation: evaluationScore(project, criteria, tokens),
    priorities: priorityScore(project, criteria, tokens),
    fundingObjectives: fundingScore(project, criteria, tokens),
    historic: historicScore(project, criteria, boost),
  };
  const score = clamp(
    breakdown.eligibility * WEIGHTS.eligibility +
      breakdown.evaluation * WEIGHTS.evaluation +
      breakdown.priorities * WEIGHTS.priorities +
      breakdown.fundingObjectives * WEIGHTS.fundingObjectives +
      breakdown.historic * WEIGHTS.historic,
  );
  const { why, strengths, gaps } = explain(project, criteria, breakdown);
  return {
    projectId: project.id,
    projectName: project.name,
    score: Math.round(score),
    breakdown: {
      eligibility: Math.round(breakdown.eligibility),
      evaluation: Math.round(breakdown.evaluation),
      priorities: Math.round(breakdown.priorities),
      fundingObjectives: Math.round(breakdown.fundingObjectives),
      historic: Math.round(breakdown.historic),
    },
    whyItQualifies: why,
    strengths,
    gaps,
  };
}

export function matchProjects(
  projects: Project[],
  criteria: NofoCriteria,
  priorFeedback: Feedback[] = [],
): MatchResult[] {
  const scored = projects
    .map((p) => scoreProject(p, criteria, priorFeedback))
    .sort((a, b) => b.score - a.score)
    .map((m, i) => ({
      ...m,
      rank: i + 1,
      recommended: m.score >= 70 && i < 12,
    }));
  return scored;
}

export function buildInsight(matches: MatchResult[], criteria: NofoCriteria, projectCount: number): string {
  const strong = matches.filter((m) => m.score >= 70).length;
  const pct = projectCount ? Math.round((strong / projectCount) * 100) : 0;
  return `Based on the ${criteria.programName} criteria and Unifier project data, ${strong} projects (${pct}%) show strong potential.`;
}

export function applyHumanDecisions(analysis: Analysis, selectedIds: string[], additions: string[]): Analysis {
  const selected = new Set(selectedIds);
  const matches = analysis.matches.map((m) => ({
    ...m,
    recommended: selected.has(m.projectId),
  }));
  return {
    ...analysis,
    matches,
    finalSelections: selectedIds,
    omittedAdditions: additions,
    status: "finalized",
    updatedAt: new Date().toISOString(),
  };
}
