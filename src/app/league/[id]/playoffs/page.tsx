import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function PlayoffsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id },
    include: { teams: true },
  });
  if (!league) notFound();
  if (league.status !== "playoffs" && league.status !== "complete") {
    redirect(`/league/${id}`);
  }
  const member = league.teams.find((t) => t.ownerId === session.id && !t.isCpu);
  if (!member && league.commissionerId !== session.id) redirect("/clubhouse");

  const teamById = Object.fromEntries(league.teams.map((t) => [t.id, t]));
  const [series, champions, playoffGames] = await Promise.all([
    prisma.playoffSeries.findMany({
      where: { leagueId: id },
      orderBy: [{ roundIndex: "asc" }, { slot: "asc" }],
    }),
    prisma.champion.findMany({
      where: { leagueId: id },
      orderBy: { seasonNumber: "desc" },
    }),
    prisma.game.findMany({
      where: { leagueId: id, round: { not: "" } },
      orderBy: [{ dayNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        seriesId: true,
        homeTeamId: true,
        awayTeamId: true,
        homeScore: true,
        awayScore: true,
        status: true,
      },
    }),
  ]);

  const gamesBySeries = new Map<string, typeof playoffGames>();
  for (const g of playoffGames) {
    if (!g.seriesId) continue;
    const list = gamesBySeries.get(g.seriesId) ?? [];
    list.push(g);
    gamesBySeries.set(g.seriesId, list);
  }

  const rounds = new Map<number, typeof series>();
  for (const s of series) {
    const list = rounds.get(s.roundIndex) ?? [];
    list.push(s);
    rounds.set(s.roundIndex, list);
  }

  const champ = champions[0];

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
          Playoffs
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Bracket, series scores, and the champion. Click a game to watch it
          pitch-by-pitch.
        </p>
        <LeagueNav leagueId={id} status={league.status} />

        {champ ? (
          <section className="champ-banner mb-10">
            <p className="champ-kick">League Champion</p>
            <h2 className="champ-name">{champ.teamName}</h2>
            <p className="champ-sub">
              {champ.teamAbbr}
              {champ.runnerUpName ? ` · def. ${champ.runnerUpName}` : ""}
              {champ.note ? ` · ${champ.note}` : ""}
            </p>
          </section>
        ) : null}

        <div className="bracket">
          {series.length === 0 ? (
            <div className="empty-diamond">
              <h2>Bracket forming</h2>
              <p className="text-[var(--fog)]">
                Seeds lock when the regular season ends.
              </p>
            </div>
          ) : (
            [...rounds.entries()].map(([roundIndex, list]) => (
              <div key={roundIndex} className="bracket-round">
                <h3 className="bracket-round-title">{list[0].round}</h3>
                {list.map((s) => {
                  const high = teamById[s.highSeedTeamId];
                  const low = teamById[s.lowSeedTeamId];
                  const highWon = s.winnerTeamId === s.highSeedTeamId;
                  const lowWon = s.winnerTeamId === s.lowSeedTeamId;
                  const games = gamesBySeries.get(s.id) ?? [];
                  return (
                    <div key={s.id} className="bracket-series">
                      <div className={`bracket-team ${highWon ? "win" : ""}`}>
                        <span className="bracket-seed">{s.highSeed}</span>
                        <span className="bracket-team-name">
                          {high?.abbreviation ?? "—"}
                        </span>
                        <span className="bracket-wins stat-mono">
                          {s.highWins}
                        </span>
                      </div>
                      <div className={`bracket-team ${lowWon ? "win" : ""}`}>
                        <span className="bracket-seed">{s.lowSeed}</span>
                        <span className="bracket-team-name">
                          {low?.abbreviation ?? "—"}
                        </span>
                        <span className="bracket-wins stat-mono">
                          {s.lowWins}
                        </span>
                      </div>
                      <div className="bracket-meta">
                        Best of {s.bestOf}
                        {s.done ? " · clinched" : ""}
                      </div>
                      {games.length > 0 ? (
                        <div className="bracket-games">
                          {games.map((g, i) => (
                            <Link
                              key={g.id}
                              href={`/league/${id}/game/${g.id}`}
                              className="bracket-game"
                            >
                              G{i + 1}:{" "}
                              {g.status === "final"
                                ? `${teamById[g.awayTeamId]?.abbreviation} ${g.awayScore}-${g.homeScore} ${teamById[g.homeTeamId]?.abbreviation}`
                                : "scheduled"}
                            </Link>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {champions.length > 1 ? (
          <section className="mt-12">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Champion history
            </h2>
            <div className="space-y-2">
              {champions.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-b border-[var(--line)] py-2 text-sm"
                >
                  <span>
                    <span className="text-[var(--fog)]">
                      Season {c.seasonNumber}
                    </span>{" "}
                    · {c.teamName}
                  </span>
                  <span className="text-[var(--fog)]">{c.note}</span>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
