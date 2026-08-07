import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Gamecast } from "@/components/Gamecast";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formatIp, type BatterBox, type PitcherBox, type PlayEvent } from "@/lib/sim";

export default async function GamePage({
  params,
}: {
  params: Promise<{ id: string; gameId: string }>;
}) {
  const { id, gameId } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) notFound();

  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!game || game.leagueId !== id) notFound();

  const member = await prisma.team.findFirst({
    where: { leagueId: id, ownerId: session.id },
  });
  if (!member && league.commissionerId !== session.id) redirect("/clubhouse");

  const plays = JSON.parse(game.playByPlay || "[]") as PlayEvent[];
  const box = JSON.parse(game.boxScore || "{}") as {
    home?: { batters: BatterBox[]; pitchers: PitcherBox[] };
    away?: { batters: BatterBox[]; pitchers: PitcherBox[] };
  };

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <Link
          href={`/league/${id}/standings`}
          className="mb-4 inline-block text-sm text-[var(--fog)] hover:text-[var(--foul)]"
        >
          ← Back to schedule
        </Link>
        <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide">
          {game.awayTeam.abbreviation} {game.awayScore} @{" "}
          {game.homeTeam.abbreviation} {game.homeScore}
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Day {game.dayNumber} · {game.awayPitcher} vs {game.homePitcher}
        </p>
        <LeagueNav leagueId={id} status={league.status} />

        {game.status !== "final" ? (
          <div className="scoreboard p-6">Game not simulated yet.</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Gamecast
              awayName={game.awayTeam.name}
              homeName={game.homeTeam.name}
              awayAbbr={game.awayTeam.abbreviation}
              homeAbbr={game.homeTeam.abbreviation}
              plays={plays}
              finalAway={game.awayScore ?? 0}
              finalHome={game.homeScore ?? 0}
            />
            <BoxTable
              title={game.awayTeam.name}
              batters={box.away?.batters ?? []}
              pitchers={box.away?.pitchers ?? []}
            />
            <BoxTable
              title={game.homeTeam.name}
              batters={box.home?.batters ?? []}
              pitchers={box.home?.pitchers ?? []}
            />
            <section className="scoreboard max-h-[480px] overflow-y-auto p-6 lg:col-span-2">
              <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Full play by play
              </h2>
              <div className="space-y-1 font-mono text-xs sm:text-sm">
                {plays.map((p, i) => (
                  <div
                    key={`${p.inning}-${p.half}-${i}`}
                    className={
                      p.text.startsWith("===")
                        ? "pt-3 text-[var(--foul)]"
                        : "text-[var(--fog)]"
                    }
                  >
                    {!p.text.startsWith("===") ? (
                      <span className="mr-2 text-[var(--chalk)]/40">
                        {p.awayScore}-{p.homeScore}
                      </span>
                    ) : null}
                    {p.text}
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

function BoxTable({
  title,
  batters,
  pitchers,
}: {
  title: string;
  batters: BatterBox[];
  pitchers: PitcherBox[];
}) {
  return (
    <section className="scoreboard overflow-x-auto p-4">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-wide">
        {title}
      </h2>
      <table className="mb-4 w-full min-w-[420px] text-left text-xs sm:text-sm">
        <thead className="text-[var(--fog)]">
          <tr>
            <th className="py-1 pr-2">Batter</th>
            <th className="px-1">AB</th>
            <th className="px-1">R</th>
            <th className="px-1">H</th>
            <th className="px-1">RBI</th>
            <th className="px-1">BB</th>
            <th className="px-1">SO</th>
            <th className="px-1">HR</th>
            <th className="px-1">SB</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => (
            <tr key={b.playerId} className="border-t border-[var(--line)]">
              <td className="py-1 pr-2">{b.name}</td>
              <td className="px-1 font-mono">{b.ab}</td>
              <td className="px-1 font-mono">{b.r}</td>
              <td className="px-1 font-mono">{b.h}</td>
              <td className="px-1 font-mono">{b.rbi}</td>
              <td className="px-1 font-mono">{b.bb}</td>
              <td className="px-1 font-mono">{b.so}</td>
              <td className="px-1 font-mono">{b.hr}</td>
              <td className="px-1 font-mono">{b.sb ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full min-w-[420px] text-left text-xs sm:text-sm">
        <thead className="text-[var(--fog)]">
          <tr>
            <th className="py-1 pr-2">Pitcher</th>
            <th className="px-1">IP</th>
            <th className="px-1">H</th>
            <th className="px-1">R</th>
            <th className="px-1">ER</th>
            <th className="px-1">BB</th>
            <th className="px-1">SO</th>
            <th className="px-1">HR</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => (
            <tr key={`${p.playerId}-${i}`} className="border-t border-[var(--line)]">
              <td className="py-1 pr-2">
                {p.name}
                {p.decision ? ` (${p.decision})` : ""}
              </td>
              <td className="px-1 font-mono">{formatIp(p.ip)}</td>
              <td className="px-1 font-mono">{p.h}</td>
              <td className="px-1 font-mono">{p.r}</td>
              <td className="px-1 font-mono">{p.er}</td>
              <td className="px-1 font-mono">{p.bb}</td>
              <td className="px-1 font-mono">{p.so}</td>
              <td className="px-1 font-mono">{p.hr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
