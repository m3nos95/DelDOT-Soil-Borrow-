import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DeleteLeagueButton } from "@/components/DeleteLeagueButton";
import { InviteCode } from "@/components/InviteCode";
import { LeagueNav } from "@/components/LeagueNav";
import { CommissionerStart, SimDayButton } from "@/components/SeasonControls";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dynastyEraById } from "@/lib/environment";
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

  const humanTeams = league.teams.filter((t) => !t.isCpu);
  const allReady =
    humanTeams.length >= 1 &&
    humanTeams.every((t) => t.draftReady) &&
    league.teams.filter((t) => t.isCpu).every((t) => t.draftReady);
  const openSlots = league.maxTeams - league.teams.length;
  const nextDay = await prisma.game.findFirst({
    where: { leagueId: id, status: "scheduled" },
    orderBy: { dayNumber: "asc" },
  });
  const remaining = await prisma.game.count({
    where: { leagueId: id, status: "scheduled" },
  });

  const era = dynastyEraById(league.era);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="mb-8">
          <p className="mb-1 font-[family-name:var(--font-display)] text-sm tracking-[0.18em] uppercase text-[var(--foul)]">
            {league.status}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-7xl">
            {league.name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[var(--fog)]">
            <InviteCode code={league.inviteCode} />
            <span>
              {era.label}
              {era.id !== "open" ? ` · ${era.yearFrom}–${era.yearTo}` : ""}
            </span>
            <span className="stat-mono">
              {league.teams.length}/{league.maxTeams} teams
            </span>
            <span className="stat-mono">{formatSalary(league.salaryCap)} cap</span>
            {league.commissionerId === session.id ? (
              <DeleteLeagueButton
                leagueId={id}
                leagueName={league.name}
              />
            ) : null}
          </div>
        </div>

        <LeagueNav leagueId={id} status={league.status} />

        {league.status === "drafting" ? (
          <section className="mb-12 grid gap-10 lg:grid-cols-2">
            <div className="panel">
              <h2 className="mb-2 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Draft room
              </h2>
              <p className="mb-5 text-[var(--fog)]">
                Snake draft — one pick at a time, then the next team. Each
                player can only be on one roster. Build 5 starters + a bullpen;
                career cards are full careers (era only decides who’s eligible).
              </p>
              <Link href={`/league/${id}/draft`} className="btn btn-primary">
                Open draft
              </Link>
            </div>
            <div className="panel">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Draft board
              </h2>
              <ul className="mb-5 space-y-2 text-sm">
                {[...league.teams]
                  .sort((a, b) => a.draftOrder - b.draftOrder)
                  .map((t) => (
                  <li key={t.id} className="flex justify-between gap-3 border-b border-[var(--line)] py-2">
                    <span>
                      <span className="stat-mono text-[var(--fog)]">
                        #{t.draftOrder + 1}
                      </span>{" "}
                      {t.abbreviation}{" "}
                      <span className="text-[var(--fog)]">
                        {t.isCpu ? "CPU" : t.owner.displayName}
                      </span>
                    </span>
                    <span
                      className={
                        t.draftReady ? "text-[var(--foul)]" : "text-[var(--fog)]"
                      }
                    >
                      {t.draftReady
                        ? "DONE"
                        : `${t.roster.length}/${league.draftRounds}`}
                    </span>
                  </li>
                ))}
              </ul>
              {openSlots > 0 ? (
                <p className="mb-4 text-sm text-[var(--fog)]">
                  {openSlots} open slot{openSlots === 1 ? "" : "s"} — fill with
                  CPU <em>before</em> the first pick, or invite friends.
                </p>
              ) : null}
              {league.commissionerId === session.id ? (
                <CommissionerStart
                  leagueId={id}
                  canStart={
                    allReady ||
                    (league.teams.length >= 2 &&
                      league.draftPickNumber >=
                        league.teams.length * league.draftRounds)
                  }
                  canFillCpu={openSlots > 0 && league.draftPickNumber === 0}
                />
              ) : (
                <p className="text-sm text-[var(--fog)]">
                  Commissioner starts after the snake draft finishes. Empty
                  slots become CPU before pick 1.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {league.status === "season" ||
        league.status === "playoffs" ||
        league.status === "complete" ? (
          <section className="mb-12 grid gap-10 lg:grid-cols-2">
            <div className="panel">
              <h2 className="mb-3 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Standings
              </h2>
              <div>
                {league.teams.map((t, i) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border-b border-[var(--line)] py-2.5 text-sm"
                  >
                    <div>
                      <span className="mr-2 text-[var(--fog)]">{i + 1}.</span>
                      {t.abbreviation}
                      {t.isCpu ? (
                        <span className="ml-2 text-[var(--fog)]">CPU</span>
                      ) : null}
                      {t.id === myTeam?.id ? (
                        <span className="ml-2 text-[var(--foul)]">you</span>
                      ) : null}
                    </div>
                    <div className="stat-mono">
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
                className="mt-4 inline-block text-sm text-[var(--foul)] hover:underline"
              >
                Full schedule →
              </Link>
            </div>
            <div className="panel">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide">
                  {league.status === "complete" ? "Results" : "Play ball"}
                </h2>
                {league.status === "season" && nextDay ? (
                  <SimDayButton leagueId={id} />
                ) : null}
              </div>
              {league.status === "season" ? (
                <p className="mb-4 text-sm text-[var(--fog)]">
                  Day {nextDay?.dayNumber ?? "—"} next · {remaining} games left
                  {" · "}
                  <Link
                    href={`/league/${id}/live`}
                    className="text-[var(--foul)] hover:underline"
                  >
                    Live slate
                  </Link>
                  {" · "}
                  <Link
                    href={`/league/${id}/awards`}
                    className="text-[var(--foul)] hover:underline"
                  >
                    Award race
                  </Link>
                </p>
              ) : (
                <p className="mb-4 text-sm text-[var(--foul)]">
                  Season complete.{" "}
                  <Link href={`/league/${id}/awards`} className="underline">
                    View awards
                  </Link>
                </p>
              )}
              <div>
                {league.games.length === 0 ? (
                  <p className="text-sm text-[var(--fog)]">
                    No games yet — sim the next day.
                  </p>
                ) : (
                  league.games.map((g) => (
                    <Link
                      key={g.id}
                      href={`/league/${id}/game/${g.id}`}
                      className="flex items-center justify-between border-b border-[var(--line)] py-2.5 text-sm transition hover:text-[var(--foul)]"
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
          <section className="panel">
            <h2 className="mb-1 font-[family-name:var(--font-display)] text-3xl tracking-wide">
              {myTeam.name}
            </h2>
            <p className="mb-5 text-sm text-[var(--fog)]">
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
