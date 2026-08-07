import { prisma } from "./db";
import type { BatterBox, PitcherBox } from "./sim";

function ipToOuts(ip: number) {
  const whole = Math.floor(ip + 1e-9);
  const thirds = Math.round((ip - whole) * 3);
  return whole * 3 + thirds;
}

export async function applyBoxToSeasonStats(opts: {
  leagueId: string;
  teamId: string;
  batters: BatterBox[];
  pitchers: PitcherBox[];
  /** Starter player id for GS credit */
  starterPlayerId?: string;
}) {
  const { leagueId, teamId, batters, pitchers, starterPlayerId } = opts;

  for (const b of batters) {
    if (!b.playerId) continue;
    const played =
      b.ab + b.bb + b.r + b.h + b.rbi + b.so + b.hr + b.sb > 0 ? 1 : 0;
    if (!played) continue;
    await prisma.seasonBattingStat.upsert({
      where: {
        leagueId_teamId_playerId: { leagueId, teamId, playerId: b.playerId },
      },
      create: {
        leagueId,
        teamId,
        playerId: b.playerId,
        g: 1,
        ab: b.ab,
        r: b.r,
        h: b.h,
        rbi: b.rbi,
        bb: b.bb,
        so: b.so,
        hr: b.hr,
        sb: b.sb ?? 0,
      },
      update: {
        g: { increment: 1 },
        ab: { increment: b.ab },
        r: { increment: b.r },
        h: { increment: b.h },
        rbi: { increment: b.rbi },
        bb: { increment: b.bb },
        so: { increment: b.so },
        hr: { increment: b.hr },
        sb: { increment: b.sb ?? 0 },
      },
    });
  }

  for (const p of pitchers) {
    if (!p.playerId) continue;
    const outs = ipToOuts(p.ip);
    if (outs <= 0 && !p.decision) continue;
    const isStarter = starterPlayerId === p.playerId;
    await prisma.seasonPitchingStat.upsert({
      where: {
        leagueId_teamId_playerId: { leagueId, teamId, playerId: p.playerId },
      },
      create: {
        leagueId,
        teamId,
        playerId: p.playerId,
        g: 1,
        gs: isStarter ? 1 : 0,
        outs,
        h: p.h,
        r: p.r,
        er: p.er,
        bb: p.bb,
        so: p.so,
        hr: p.hr,
        w: p.decision === "W" ? 1 : 0,
        l: p.decision === "L" ? 1 : 0,
        sv: p.decision === "S" ? 1 : 0,
        hld: p.decision === "H" ? 1 : 0,
      },
      update: {
        g: { increment: 1 },
        gs: { increment: isStarter ? 1 : 0 },
        outs: { increment: outs },
        h: { increment: p.h },
        r: { increment: p.r },
        er: { increment: p.er },
        bb: { increment: p.bb },
        so: { increment: p.so },
        hr: { increment: p.hr },
        w: { increment: p.decision === "W" ? 1 : 0 },
        l: { increment: p.decision === "L" ? 1 : 0 },
        sv: { increment: p.decision === "S" ? 1 : 0 },
        hld: { increment: p.decision === "H" ? 1 : 0 },
      },
    });
  }
}

export function battingAverage(ab: number, h: number) {
  if (ab <= 0) return 0;
  return h / ab;
}

export function onBasePct(ab: number, h: number, bb: number) {
  const pa = ab + bb;
  if (pa <= 0) return 0;
  return (h + bb) / pa;
}

export function earnedRunAvg(er: number, outs: number) {
  if (outs <= 0) return 0;
  return (er * 27) / outs;
}

export function whip(h: number, bb: number, outs: number) {
  if (outs <= 0) return 0;
  return ((h + bb) * 3) / outs;
}
