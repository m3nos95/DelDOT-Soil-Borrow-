import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { CommissionerStart, SimDayButton } from "@/components/SeasonControls";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatRecord, formatSalary, runDifferential } from "@/lib/format";

export default async function LeaguePage({
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
        include: { owner: true, roster: { include: { player: true } } },
        orderBy: [{ wins: "desc" }, { runsFor: "desc" }],
      },
      games: {
        where: { status: "final" },
        orderBy: [{ dayNumber: "desc" }, { playedAt: "desc" }],
        take: 8,
        include: { homeTeam: true, awayTeam: true },
      },
    },
  });
  if (!league) notFound();

  const myTeam = league.teams.find((t) => t.ownerId === session.id);
  if (!myTeam && league.commissionerId !== session.id) {
    redirect("/clubhouse");
  }

  const allReady =
    league.teams.length >= 2 && league.teams.every((t) => t.draftReady);
  const nextDay = await prisma.game.findFirst({
    where: { leagueId: id, status: "scheduled" },
    orderBy: { dayNumber: "asc" },
  });
  const remaining = await prisma.game.count({
    where: { leagueId: id, status: "scheduled" },
  });

  return (
    <div className="min-h-screen">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
              {league.name}
            </h1>
            <p className="mt-1 text-sm text-[var(--fog)]">
              Invite code{" "}
              <span className="font-mono tracking-[0.25em] text-[var(--foul)]">
                {league.inviteCode}
              </span>{" "}
              · {league.teams.length}/{league.maxTeams} teams ·{" "}
              {formatSalary(league.salaryCap)} cap
            </p>
          </div>
          <div className="text-xs uppercase tracking-[0.2em] text-[var(--fog)]">
            Status: {league.status}
          </div>
        </div>

        <LeagueNav leagueId={id} status={league.status} />

        {league.status === "drafting" ? (
          <section className="mb-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="scoreboard p-6">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Draft room
              </h2>
              <p className="mb-4 text-[var(--fog)]">
                Build a 25-man roster under the salary cap. Need at least 10
                hitters and 6 pitchers before you lock.
              </p>
              <Link href={`/league/${id}/draft`} className="btn btn-primary">
                Open draft board
              </Link>
            </div>
            <div className="scoreboard p-6">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Ready check
              </h2>
              <ul className="mb-4 space-y-2 text-sm">
                {league.teams.map((t) => (
                  <li key={t.id} className="flex justify-between gap-3">
                    <span>
                      {t.name}{" "}
                      <span className="text-[var(--fog)]">
                        ({t.owner.displayName})
                      </span>
                    </span>
                    <span
                      className={
                        t.draftReady ? "text-[var(--foul)]" : "text-[var(--fog)]"
                      }
                    >
                      {t.draftReady
                        ? "LOCKED"
                        : `${t.roster.length} players`}
                    </span>
                  </li>
                ))}
              </ul>
              {league.commissionerId === session.id ? (
                <CommissionerStart leagueId={id} canStart={allReady} />
              ) : (
                <p className="text-sm text-[var(--fog)]">
                  Commissioner starts the season when everyone is locked.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {league.status === "season" || league.status === "complete" ? (
          <section className="mb-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="scoreboard p-6">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Standings
              </h2>
              <div className="space-y-2">
                {league.teams.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm"
                  >
                    <div>
                      <span className="mr-2 text-[var(--fog)]">{i + 1}.</span>
                      {t.name}
                      {t.id === myTeam?.id ? (
                        <span className="ml-2 text-[var(--foul)]">you</span>
                      ) : null}
                    </div>
                    <div className="font-mono">
                      {formatRecord(t.wins, t.losses)}{" "}
                      <span className="text-[var(--fog)]">
                        ({runDifferential(t.runsFor, t.runsAgainst)})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Link
                href={`/league/${id}/standings`}
                className="mt-4 inline-block text-sm text-[var(--foul)]"
              >
                Full standings & schedule →
              </Link>
            </div>
            <div className="scoreboard p-6">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
                  {league.status === "complete" ? "Final results" : "Play ball"}
                </h2>
                {league.status === "season" && nextDay ? (
                  <SimDayButton leagueId={id} />
                ) : null}
              </div>
              {league.status === "season" ? (
                <p className="mb-4 text-sm text-[var(--fog)]">
                  Next: Day {nextDay?.dayNumber ?? "—"} · {remaining} games left
                </p>
              ) : (
                <p className="mb-4 text-sm text-[var(--foul)]">Season complete.</p>
              )}
              <div className="space-y-2">
                {league.games.length === 0 ? (
                  <p className="text-sm text-[var(--fog)]">
                    No games played yet. Hit sim next day.
                  </p>
                ) : (
                  league.games.map((g) => (
                    <Link
                      key={g.id}
                      href={`/league/${id}/game/${g.id}`}
                      className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm transition hover:text-[var(--foul)]"
                    >
                      <span>
                        {g.awayTeam.abbreviation} {g.awayScore} @{" "}
                        {g.homeTeam.abbreviation} {g.homeScore}
                      </span>
                      <span className="text-[var(--fog)]">Day {g.dayNumber}</span>
                    </Link>
                  ))
                )}
              </div>
            </div>
          </section>
        ) : null}

        {myTeam ? (
          <section className="scoreboard p-6">
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl tracking-wide">
              {myTeam.name}
            </h2>
            <p className="mb-4 text-sm text-[var(--fog)]">
              {myTeam.park} · Payroll{" "}
              {formatSalary(
                myTeam.roster.reduce((s, r) => s + r.player.salary, 0),
              )}
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href={`/league/${id}/draft`} className="btn btn-ghost">
                Roster / draft
              </Link>
              <Link href={`/league/${id}/team`} className="btn btn-ghost">
                Lineup & rotation
              </Link>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
