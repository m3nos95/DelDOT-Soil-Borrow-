import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import {
  AutoAdvanceToggle,
  PlayDayButton,
} from "@/components/LiveDayControls";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type GameRow = {
  id: string;
  dayNumber: number;
  status: string;
  homeScore: number;
  awayScore: number;
  homePitcher: string;
  awayPitcher: string;
  homeTeam: { abbreviation: string; name: string };
  awayTeam: { abbreviation: string; name: string };
};

function ScoreCard({
  leagueId,
  game,
}: {
  leagueId: string;
  game: GameRow;
}) {
  const final = game.status === "final";
  const awayWon = final && game.awayScore > game.homeScore;
  const homeWon = final && game.homeScore > game.awayScore;
  return (
    <div className="live-card">
      <div className="live-row">
        <span className={`live-team ${awayWon ? "win" : ""}`}>
          {game.awayTeam.abbreviation}
          <span className="live-city">{game.awayTeam.name}</span>
        </span>
        <span className={`live-score stat-mono ${awayWon ? "win" : ""}`}>
          {final ? game.awayScore : "–"}
        </span>
      </div>
      <div className="live-row">
        <span className={`live-team ${homeWon ? "win" : ""}`}>
          {game.homeTeam.abbreviation}
          <span className="live-city">{game.homeTeam.name}</span>
        </span>
        <span className={`live-score stat-mono ${homeWon ? "win" : ""}`}>
          {final ? game.homeScore : "–"}
        </span>
      </div>
      <div className="live-foot">
        {final ? (
          <>
            <span className="live-status">Final</span>
            <Link
              href={`/league/${leagueId}/game/${game.id}`}
              className="live-watch"
            >
              Watch replay →
            </Link>
          </>
        ) : (
          <>
            <span className="live-status live-scheduled">Scheduled</span>
            <span className="live-matchup">
              {game.awayPitcher || "TBD"} vs {game.homePitcher || "TBD"}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export default async function LivePage({
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
  if (league.status !== "season" && league.status !== "complete") {
    redirect(`/league/${id}`);
  }
  const isCommissioner = league.commissionerId === session.id;
  const member = league.teams.find((t) => t.ownerId === session.id && !t.isCpu);
  if (!member && !isCommissioner) redirect("/clubhouse");

  const nextScheduled = await prisma.game.findFirst({
    where: { leagueId: id, status: "scheduled" },
    orderBy: { dayNumber: "asc" },
  });
  const currentDay = nextScheduled?.dayNumber ?? null;

  const lastFinal = await prisma.game.findFirst({
    where: { leagueId: id, status: "final" },
    orderBy: [{ dayNumber: "desc" }],
  });
  const lastFinalDay = lastFinal?.dayNumber ?? null;

  const [today, results] = await Promise.all([
    currentDay != null
      ? prisma.game.findMany({
          where: { leagueId: id, dayNumber: currentDay },
          include: { homeTeam: true, awayTeam: true },
          orderBy: { id: "asc" },
        })
      : Promise.resolve([]),
    lastFinalDay != null
      ? prisma.game.findMany({
          where: { leagueId: id, dayNumber: lastFinalDay, status: "final" },
          include: { homeTeam: true, awayTeam: true },
          orderBy: { id: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
              Live
            </h1>
            <p className="text-[var(--fog)]">
              The daily slate. Play the day, then watch any game pitch-by-pitch.
            </p>
          </div>
          {isCommissioner ? (
            <AutoAdvanceToggle leagueId={id} enabled={league.autoAdvance} />
          ) : null}
        </div>
        <LeagueNav leagueId={id} status={league.status} />

        {league.status === "complete" ? (
          <section className="empty-diamond mb-10">
            <h2>Season complete</h2>
            <p className="text-[var(--fog)]">
              Every game is in the books.{" "}
              <Link href={`/league/${id}/awards`} className="text-[var(--foul)] underline">
                See the awards
              </Link>{" "}
              or rewatch any game below.
            </p>
          </section>
        ) : (
          <section className="mb-12">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--foul)]">
                {currentDay != null ? `Day ${currentDay} — today's slate` : "No games scheduled"}
              </h2>
              {currentDay != null ? <PlayDayButton leagueId={id} /> : null}
            </div>
            {league.autoAdvance ? (
              <p className="mb-4 text-sm text-[var(--fog)]">
                Auto-play is on — one game-day simulates automatically each real
                day. You can still play ahead manually anytime.
              </p>
            ) : null}
            <div className="live-grid">
              {today.map((g) => (
                <ScoreCard key={g.id} leagueId={id} game={g as GameRow} />
              ))}
            </div>
          </section>
        )}

        {results.length > 0 ? (
          <section>
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide">
              Latest results — Day {lastFinalDay}
            </h2>
            <div className="live-grid">
              {results.map((g) => (
                <ScoreCard key={g.id} leagueId={id} game={g as GameRow} />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
