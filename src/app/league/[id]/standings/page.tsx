import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { SimDayButton } from "@/components/SeasonControls";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { runDifferential } from "@/lib/format";

export default async function StandingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      teams: {
        orderBy: [{ wins: "desc" }, { runsFor: "desc" }],
      },
      games: {
        orderBy: [{ dayNumber: "asc" }, { id: "asc" }],
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });
  if (!league) notFound();

  const member = league.teams.find((t) => t.ownerId === session.id);
  if (!member && league.commissionerId !== session.id) redirect("/clubhouse");

  const byDay = new Map<number, typeof league.games>();
  for (const g of league.games) {
    const list = byDay.get(g.dayNumber) ?? [];
    list.push(g);
    byDay.set(g.dayNumber, list);
  }

  return (
    <div className="min-h-screen">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
              Standings
            </h1>
            <p className="text-[var(--fog)]">Records, run differential, schedule.</p>
          </div>
          {league.status === "season" ? <SimDayButton leagueId={id} /> : null}
        </div>
        <LeagueNav leagueId={id} status={league.status} />

        <section className="scoreboard mb-8 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.14em] text-[var(--fog)]">
              <tr>
                <th className="px-4 py-3">Team</th>
                <th className="px-4 py-3">W</th>
                <th className="px-4 py-3">L</th>
                <th className="px-4 py-3">RS</th>
                <th className="px-4 py-3">RA</th>
                <th className="px-4 py-3">Diff</th>
              </tr>
            </thead>
            <tbody>
              {league.teams.map((t) => (
                <tr key={t.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    {t.name}{" "}
                    <span className="text-[var(--fog)]">({t.abbreviation})</span>
                  </td>
                  <td className="px-4 py-3 font-mono">{t.wins}</td>
                  <td className="px-4 py-3 font-mono">{t.losses}</td>
                  <td className="px-4 py-3 font-mono">{t.runsFor}</td>
                  <td className="px-4 py-3 font-mono">{t.runsAgainst}</td>
                  <td className="px-4 py-3 font-mono">
                    {runDifferential(t.runsFor, t.runsAgainst)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
            Schedule
          </h2>
          <div className="space-y-4">
            {[...byDay.entries()].map(([day, games]) => (
              <div key={day} className="scoreboard p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.2em] text-[var(--foul)]">
                  Day {day}
                </div>
                <div className="space-y-2">
                  {games.map((g) => (
                    <div
                      key={g.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <span>
                        {g.awayTeam.abbreviation}
                        {g.status === "final" ? ` ${g.awayScore}` : ""} @{" "}
                        {g.homeTeam.abbreviation}
                        {g.status === "final" ? ` ${g.homeScore}` : ""}
                      </span>
                      {g.status === "final" ? (
                        <Link
                          href={`/league/${id}/game/${g.id}`}
                          className="text-[var(--foul)]"
                        >
                          Box / PBP
                        </Link>
                      ) : (
                        <span className="text-[var(--fog)]">scheduled</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
