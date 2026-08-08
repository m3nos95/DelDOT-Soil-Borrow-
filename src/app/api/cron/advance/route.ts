import { NextResponse } from "next/server";
import { runCpuFrontOffice } from "@/lib/cpu";
import { prisma } from "@/lib/db";
import { simulateNextDay } from "@/lib/league";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Advances one game-day for every league with auto-advance enabled.
 * Intended to run daily (Vercel Cron) so the season unfolds like a real
 * MLB calendar. Protected by CRON_SECRET when set (Vercel sends it as a
 * Bearer token automatically).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const leagues = await prisma.league.findMany({
    where: { status: "season", autoAdvance: true },
    select: { id: true },
  });

  const results: { leagueId: string; simulated: number; day: number | null }[] =
    [];
  for (const l of leagues) {
    try {
      await runCpuFrontOffice(l.id);
      const res = await simulateNextDay(l.id);
      results.push({ leagueId: l.id, simulated: res.simulated, day: res.dayNumber });
    } catch (e) {
      results.push({ leagueId: l.id, simulated: -1, day: null });
      console.error(`auto-advance failed for ${l.id}`, e);
    }
  }

  return NextResponse.json({ advanced: results.length, results });
}
