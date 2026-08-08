import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Gamecast } from "@/components/Gamecast";
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
    <div className="page-shell theater">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/league/${id}`}
              className="mb-3 inline-block font-[family-name:var(--font-display)] text-sm tracking-[0.14em] uppercase text-[var(--fog)] transition-colors hover:text-[var(--foul)]"
            >
              ← {league.name}
            </Link>
            <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
              <span className="text-[var(--fog)]">
                {game.awayTeam.abbreviation}
              </span>{" "}
              <span className="stat-mono text-[var(--foul)]">
                {game.awayScore ?? "–"}
              </span>
              <span className="mx-2 text-[var(--fog)]">@</span>
              <span className="text-[var(--fog)]">
                {game.homeTeam.abbreviation}
              </span>{" "}
              <span className="stat-mono text-[var(--foul)]">
                {game.homeScore ?? "–"}
              </span>
            </h1>
            <p className="theater-meta mt-3">
              Day {game.dayNumber}
              {" · "}
              {game.awayPitcher} vs {game.homePitcher}
            </p>
          </div>
          <Link
            href={`/league/${id}/standings`}
            className="btn btn-ghost !py-2 !px-4 !text-sm"
          >
            Schedule
          </Link>
        </div>

        {game.status !== "final" ? (
          <div className="panel">
            <p className="text-[var(--fog)]">Game not simulated yet.</p>
          </div>
        ) : (
          <>
            <div className="theater-stage fade-up">
              <Gamecast
                awayName={game.awayTeam.name}
                homeName={game.homeTeam.name}
                awayAbbr={game.awayTeam.abbreviation}
                homeAbbr={game.homeTeam.abbreviation}
                plays={plays}
                finalAway={game.awayScore ?? 0}
                finalHome={game.homeScore ?? 0}
              />
            </div>

            <section className="mb-10 grid gap-8 lg:grid-cols-2">
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
            </section>

            <section className="panel">
              <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
                Full play by play
              </h2>
              <div className="max-h-[420px] space-y-1 overflow-y-auto pr-2 text-sm">
                {plays.map((p, i) => (
                  <div
                    key={`${p.inning}-${p.half}-${i}`}
                    className={
                      p.text.startsWith("===")
                        ? "pt-3 font-[family-name:var(--font-display)] tracking-wide text-[var(--foul)]"
                        : "text-[var(--fog)]"
                    }
                  >
                    {!p.text.startsWith("===") ? (
                      <span className="stat-mono mr-2 text-[var(--chalk)]/35">
                        {p.awayScore}-{p.homeScore}
                      </span>
                    ) : null}
                    {p.text}
                  </div>
                ))}
              </div>
            </section>
          </>
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
    <section className="panel overflow-x-auto">
      <h2 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-wide">
        {title}
      </h2>
      <table className="mb-5 w-full min-w-[420px] text-left text-sm">
        <thead className="font-[family-name:var(--font-display)] text-xs tracking-[0.1em] uppercase text-[var(--fog)]">
          <tr>
            <th className="py-1 pr-2 font-normal">Batter</th>
            <th className="px-1 font-normal">AB</th>
            <th className="px-1 font-normal">R</th>
            <th className="px-1 font-normal">H</th>
            <th className="px-1 font-normal">2B</th>
            <th className="px-1 font-normal">3B</th>
            <th className="px-1 font-normal">RBI</th>
            <th className="px-1 font-normal">BB</th>
            <th className="px-1 font-normal">SO</th>
            <th className="px-1 font-normal">HR</th>
            <th className="px-1 font-normal">SB</th>
          </tr>
        </thead>
        <tbody>
          {batters.map((b) => (
            <tr key={b.playerId} className="border-t border-[var(--line)]">
              <td className="py-1.5 pr-2">{b.name}</td>
              <td className="stat-mono px-1">{b.ab}</td>
              <td className="stat-mono px-1">{b.r}</td>
              <td className="stat-mono px-1">{b.h}</td>
              <td className="stat-mono px-1">{b.doubles ?? 0}</td>
              <td className="stat-mono px-1">{b.triples ?? 0}</td>
              <td className="stat-mono px-1">{b.rbi}</td>
              <td className="stat-mono px-1">{b.bb}</td>
              <td className="stat-mono px-1">{b.so}</td>
              <td className="stat-mono px-1">{b.hr}</td>
              <td className="stat-mono px-1">{b.sb ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table className="w-full min-w-[420px] text-left text-sm">
        <thead className="font-[family-name:var(--font-display)] text-xs tracking-[0.1em] uppercase text-[var(--fog)]">
          <tr>
            <th className="py-1 pr-2 font-normal">Pitcher</th>
            <th className="px-1 font-normal">IP</th>
            <th className="px-1 font-normal">H</th>
            <th className="px-1 font-normal">R</th>
            <th className="px-1 font-normal">ER</th>
            <th className="px-1 font-normal">BB</th>
            <th className="px-1 font-normal">SO</th>
            <th className="px-1 font-normal">HR</th>
          </tr>
        </thead>
        <tbody>
          {pitchers.map((p, i) => (
            <tr
              key={`${p.playerId}-${i}`}
              className="border-t border-[var(--line)]"
            >
              <td className="py-1.5 pr-2">
                {p.name}
                {p.decision ? ` (${p.decision})` : ""}
              </td>
              <td className="stat-mono px-1">{formatIp(p.ip)}</td>
              <td className="stat-mono px-1">{p.h}</td>
              <td className="stat-mono px-1">{p.r}</td>
              <td className="stat-mono px-1">{p.er}</td>
              <td className="stat-mono px-1">{p.bb}</td>
              <td className="stat-mono px-1">{p.so}</td>
              <td className="stat-mono px-1">{p.hr}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
