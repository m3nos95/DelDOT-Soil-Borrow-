import { promises as fs } from "fs";
import path from "path";
import type { Analysis, Feedback, Project } from "./types";
import { getUnfundedProjects } from "./sample-projects";
import { slugId } from "./utils";

const STORE_PATH = path.join(process.cwd(), "data", "store.json");

export type StoreShape = {
  analyses: Analysis[];
  projects: Project[];
  globalFeedback: Feedback[];
};

const memory: { current: StoreShape | null } = { current: null };

function emptyStore(): StoreShape {
  return {
    analyses: [],
    projects: getUnfundedProjects(),
    globalFeedback: [],
  };
}

async function ensureDir() {
  await fs.mkdir(path.dirname(STORE_PATH), { recursive: true });
}

export async function readStore(): Promise<StoreShape> {
  if (memory.current) return memory.current;
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreShape;
    if (!parsed.projects?.length) parsed.projects = getUnfundedProjects();
    if (!parsed.analyses) parsed.analyses = [];
    if (!parsed.globalFeedback) parsed.globalFeedback = [];
    memory.current = parsed;
    return parsed;
  } catch {
    const fresh = emptyStore();
    memory.current = fresh;
    return fresh;
  }
}

export async function writeStore(next: StoreShape): Promise<void> {
  memory.current = next;
  await ensureDir();
  await fs.writeFile(STORE_PATH, JSON.stringify(next, null, 2), "utf8");
}

export async function saveAnalysis(analysis: Analysis): Promise<Analysis> {
  const store = await readStore();
  const idx = store.analyses.findIndex((a) => a.id === analysis.id);
  if (idx >= 0) store.analyses[idx] = analysis;
  else store.analyses.unshift(analysis);
  await writeStore(store);
  return analysis;
}

export async function getAnalysis(id: string): Promise<Analysis | undefined> {
  const store = await readStore();
  return store.analyses.find((a) => a.id === id);
}

export async function listAnalyses(): Promise<Analysis[]> {
  const store = await readStore();
  return store.analyses;
}

export async function addFeedback(analysisId: string, feedback: Omit<Feedback, "id" | "createdAt">): Promise<Feedback> {
  const store = await readStore();
  const analysis = store.analyses.find((a) => a.id === analysisId);
  if (!analysis) throw new Error("Analysis not found");
  const item: Feedback = {
    ...feedback,
    id: slugId("fb"),
    createdAt: new Date().toISOString(),
  };
  analysis.feedback.push(item);
  analysis.status = analysis.status === "finalized" ? "finalized" : "in_review";
  analysis.updatedAt = item.createdAt;
  store.globalFeedback.push(item);
  await writeStore(store);
  return item;
}

export async function replaceProjects(projects: Project[]): Promise<void> {
  const store = await readStore();
  store.projects = projects;
  await writeStore(store);
}

export async function getProjects(): Promise<Project[]> {
  const store = await readStore();
  return store.projects;
}

export async function resetStore(): Promise<StoreShape> {
  const fresh = emptyStore();
  await writeStore(fresh);
  return fresh;
}
