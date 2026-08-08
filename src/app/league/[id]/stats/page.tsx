import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatIp } from "@/lib/sim";
import {
  battingAverage,
  earnedRunAvg,
  onBasePctFull,
  per9,
  sluggingPct,
  whip,
} from "@/lib/stats";

const fmt3 = (n: number) => n.toFixed(3).replace(/^0/, "");

export default async function StatsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id },
    include: { teams: true },
  });
  if (!league) notFound();
  if (league.status !== "season" && league.status !== "complete") {
    redirect(`/league/${id}`);
  }

  const member = league.teams.find(
    (t) => t.ownerId === session.id && !t.isCpu,
  );
  if (!member && league.commissionerId !== session.id) redirect("/clubhouse");

  const tab = sp.tab === "pitching" ? "pitching" : "batting";
  const teamById = Object.fromEntries(league.teams.map((t) => [t.id, t]));

  const batting = await prisma.seasonBattingStat.findMany({
    where: { leagueId: id, ab: { gte: 1 } },
    include: { player: true },
    orderBy: [{ hr: "desc" }, { h: "desc" }],
    take: 100,
  });
  const pitching = await prisma.seasonPitchingStat.findMany({
    where: { leagueId: id, outs: { gte: 3 } },
    include: { player: true },
    orderBy: [{ so: "desc" }, { w: "desc" }],
    take: 100,
  });

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
          Season stats
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Counting lines compiled after every simulated game.
        </p>
        <LeagueNav leagueId={id} status={league.status} />

        <div className="chip-tabs mb-6">
          <a
            href={`/league/${id}/stats`}
            className="chip-tab"
            data-active={tab === "batting"}
          >
            Batting
          </a>
          <a
            href={`/league/${id}/stats?tab=pitching`}
            className="chip-tab"
            data-active={tab === "pitching"}
          >
            Pitching
          </a>
        </div>

        {tab === "batting" ? (
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="draft-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>G</th>
                  <th>AB</th>
                  <th>R</th>
                  <th>H</th>
                  <th>HR</th>
                  <th>RBI</th>
                  <th>BB</th>
                  <th>SO</th>
                  <th>SB</th>
                  <th>2B</th>
                  <th>3B</th>
                  <th>AVG</th>
                  <th>OBP</th>
                  <th>SLG</th>
                  <th>OPS</th>
                </tr>
              </thead>
              <tbody>
                {batting.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td>
                      <div className="player-name">{s.player.name}</div>
                    </td>
                    <td className="stat-mono text-sm">
                      {teamById[s.teamId]?.abbreviation ?? "—"}
                    </td>
                    <td className="stat-mono text-sm">{s.g}</td>
                    <td className="stat-mono text-sm">{s.ab}</td>
                    <td className="stat-mono text-sm">{s.r}</td>
                    <td className="stat-mono text-sm">{s.h}</td>
                    <td className="stat-mono text-sm">{s.hr}</td>
                    <td className="stat-mono text-sm">{s.rbi}</td>
                    <td className="stat-mono text-sm">{s.bb}</td>
                    <td className="stat-mono text-sm">{s.so}</td>
                    <td className="stat-mono text-sm">{s.sb}</td>
                    <td className="stat-mono text-sm">{s.doubles}</td>
                    <td className="stat-mono text-sm">{s.triples}</td>
                    <td className="stat-mono text-sm">
                      {fmt3(battingAverage(s.ab, s.h))}
                    </td>
                    <td className="stat-mono text-sm">
                      {fmt3(onBasePctFull(s.ab, s.h, s.bb, s.hbp, s.sf))}
                    </td>
                    <td className="stat-mono text-sm">
                      {fmt3(sluggingPct(s.ab, s.h, s.doubles, s.triples, s.hr))}
                    </td>
                    <td className="stat-mono text-sm">
                      {fmt3(
                        onBasePctFull(s.ab, s.h, s.bb, s.hbp, s.sf) +
                          sluggingPct(s.ab, s.h, s.doubles, s.triples, s.hr),
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--line)]">
            <table className="draft-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Team</th>
                  <th>G</th>
                  <th>GS</th>
                  <th>W</th>
                  <th>L</th>
                  <th>SV</th>
                  <th>QS</th>
                  <th>CG</th>
                  <th>IP</th>
                  <th>SO</th>
                  <th>BB</th>
                  <th>ERA</th>
                  <th>WHIP</th>
                  <th>K/9</th>
                </tr>
              </thead>
              <tbody>
                {pitching.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td>
                      <div className="player-name">{s.player.name}</div>
                    </td>
                    <td className="stat-mono text-sm">
                      {teamById[s.teamId]?.abbreviation ?? "—"}
                    </td>
                    <td className="stat-mono text-sm">{s.g}</td>
                    <td className="stat-mono text-sm">{s.gs}</td>
                    <td className="stat-mono text-sm">{s.w}</td>
                    <td className="stat-mono text-sm">{s.l}</td>
                    <td className="stat-mono text-sm">{s.sv}</td>
                    <td className="stat-mono text-sm">{s.qs}</td>
                    <td className="stat-mono text-sm">{s.cg}</td>
                    <td className="stat-mono text-sm">
                      {formatIp(s.outs / 3)}
                    </td>
                    <td className="stat-mono text-sm">{s.so}</td>
                    <td className="stat-mono text-sm">{s.bb}</td>
                    <td className="stat-mono text-sm">
                      {earnedRunAvg(s.er, s.outs).toFixed(2)}
                    </td>
                    <td className="stat-mono text-sm">
                      {whip(s.h, s.bb, s.outs).toFixed(2)}
                    </td>
                    <td className="stat-mono text-sm">
                      {per9(s.so, s.outs).toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
