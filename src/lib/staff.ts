/**
 * Pitching staff construction: 5-man rotation + bullpen.
 * One ace cannot start 162 — SP1–SP5 must be distinct arms.
 */

export const SP_ROLES = ["SP1", "SP2", "SP3", "SP4", "SP5"] as const;
export const PEN_ROLES = ["CL", "SU1", "SU2", "LR"] as const;
export const STAFF_ROLES = [...SP_ROLES, ...PEN_ROLES] as const;

export const MIN_STARTERS = 5;
export const MIN_RELIEVERS = 3;
export const MIN_PITCHERS = MIN_STARTERS + MIN_RELIEVERS; // 8

export type StaffPlayer = {
  id: string;
  name?: string;
  isPitcher: boolean;
  durability?: number;
  careerWAR?: number;
  salary?: number;
  description?: string;
};

/** SP/RP from ingest tag in description, else durability heuristic. */
export function pitcherRole(p: StaffPlayer): "SP" | "RP" {
  const d = p.description ?? "";
  if (/·\s*SP\b/.test(d)) return "SP";
  if (/·\s*RP\b/.test(d)) return "RP";
  return (p.durability ?? 50) >= 58 ? "SP" : "RP";
}

export function buildDefaultStaff(
  pitchers: StaffPlayer[],
): { playerId: string; role: string }[] {
  const arms = pitchers.filter((p) => p.isPitcher);
  const score = (p: StaffPlayer) =>
    (p.careerWAR ?? 0) * 10 + (p.durability ?? 50) * 0.05;

  const starters = arms
    .filter((p) => pitcherRole(p) === "SP")
    .sort((a, b) => score(b) - score(a));
  const relievers = arms
    .filter((p) => pitcherRole(p) === "RP")
    .sort((a, b) => score(b) - score(a));

  // Fill a 5-man from true SPs first; borrow durable RPs only if short
  const rotation: StaffPlayer[] = [...starters];
  if (rotation.length < MIN_STARTERS) {
    const borrow = [...relievers].sort(
      (a, b) => (b.durability ?? 0) - (a.durability ?? 0),
    );
    for (const p of borrow) {
      if (rotation.length >= MIN_STARTERS) break;
      rotation.push(p);
    }
  }
  // Still short? any remaining arms
  if (rotation.length < MIN_STARTERS) {
    for (const p of arms.sort((a, b) => score(b) - score(a))) {
      if (rotation.some((r) => r.id === p.id)) continue;
      rotation.push(p);
      if (rotation.length >= MIN_STARTERS) break;
    }
  }

  const used = new Set(rotation.slice(0, MIN_STARTERS).map((p) => p.id));
  const penPool: StaffPlayer[] = [];
  const pushPen = (list: StaffPlayer[]) => {
    for (const p of list) {
      if (used.has(p.id)) continue;
      used.add(p.id);
      penPool.push(p);
    }
  };
  pushPen(relievers);
  pushPen(starters);
  pushPen(arms);

  const slots: { playerId: string; role: string }[] = [];
  for (let i = 0; i < MIN_STARTERS; i++) {
    const p = rotation[i];
    if (!p) break;
    slots.push({ playerId: p.id, role: SP_ROLES[i] });
  }
  for (let i = 0; i < PEN_ROLES.length; i++) {
    const p = penPool[i];
    if (!p) break;
    slots.push({ playerId: p.id, role: PEN_ROLES[i] });
  }
  return slots;
}

export function validateStaffSlots(
  slots: { playerId: string; role: string }[],
): string | null {
  const byRole = new Map(slots.map((s) => [s.role, s.playerId]));
  const ids = slots.map((s) => s.playerId);
  if (new Set(ids).size !== ids.length) {
    return "Each pitcher can only fill one staff role";
  }
  for (const role of SP_ROLES) {
    if (!byRole.get(role)) {
      return "Need 5 starting pitchers (SP1–SP5) — one ace can't throw every day";
    }
  }
  const penFilled = PEN_ROLES.filter((r) => byRole.has(r)).length;
  if (penFilled < MIN_RELIEVERS) {
    return `Need at least ${MIN_RELIEVERS} bullpen arms (CL / SU / LR)`;
  }
  return null;
}

export function countPitcherBuckets(pitchers: StaffPlayer[]) {
  let sp = 0;
  let rp = 0;
  for (const p of pitchers) {
    if (pitcherRole(p) === "SP") sp += 1;
    else rp += 1;
  }
  return { sp, rp, total: pitchers.length };
}
