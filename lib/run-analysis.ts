import { extractNofoCriteria } from "./extract-nofo";
import { buildInsight, matchProjects } from "./matching";
import { getProjects, listAnalyses, saveAnalysis } from "./store";
import type { Analysis, Project } from "./types";
import { slugId } from "./utils";

export async function runAnalysis(input: {
  nofoText: string;
  nofoFileName: string;
  projectFileName: string;
  projects?: Project[];
}): Promise<Analysis> {
  const criteria = extractNofoCriteria(input.nofoText, input.nofoFileName);
  const projects = input.projects?.length ? input.projects : await getProjects();
  const prior = await listAnalyses();
  const priorFeedback = prior.flatMap((a) => a.feedback);
  const matches = matchProjects(projects, criteria, priorFeedback);
  const now = new Date().toISOString();
  const strongMatchCount = matches.filter((m) => m.recommended).length;
  const analysis: Analysis = {
    id: slugId("an"),
    createdAt: now,
    updatedAt: now,
    nofoName: criteria.programName,
    nofoFileName: input.nofoFileName,
    projectFileName: input.projectFileName,
    projectCount: projects.length,
    status: "ready",
    criteria,
    matches,
    insight: buildInsight(matches, criteria, projects.length),
    strongMatchCount,
    feedback: [],
    finalSelections: matches.filter((m) => m.recommended).map((m) => m.projectId),
    omittedAdditions: [],
  };
  await saveAnalysis(analysis);
  return analysis;
}
