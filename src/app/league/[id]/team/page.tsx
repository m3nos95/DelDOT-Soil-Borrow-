import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { LineupEditor } from "@/components/LineupEditor";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDefaultLineup } from "@/lib/league";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({ where: { id } });
  if (!league) notFound();

  const team = await prisma.team.findFirst({
    where: { leagueId: id, ownerId: session.id },
    include: {
      roster: { include: { player: true } },
      lineup: true,
      staff: true,
    },
  });
  if (!team) redirect("/clubhouse");

  if (team.roster.length >= 10 && team.lineup.length === 0) {
    await ensureDefaultLineup(team.id);
  }

  const refreshed = await prisma.team.findUnique({
    where: { id: team.id },
    include: {
      roster: { include: { player: true } },
      lineup: true,
      staff: true,
    },
  });
  if (!refreshed) notFound();

  const hitters = refreshed.roster
    .map((r) => r.player)
    .filter((p) => !p.isPitcher);
  const pitchers = refreshed.roster
    .map((r) => r.player)
    .filter((p) => p.isPitcher);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide">
          {refreshed.name}
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Set your nine and your arms. Starters rotate by game day.
        </p>
        <LeagueNav leagueId={id} status={league.status} />
        {refreshed.roster.length < 10 ? (
          <div className="scoreboard p-6 text-[var(--fog)]">
            Draft at least 10 hitters and some pitchers before setting a lineup.
          </div>
        ) : (
          <LineupEditor
            leagueId={id}
            hitters={hitters.map((p) => ({
              id: p.id,
              name: p.name,
              primaryPos: p.primaryPos,
              positions: p.positions,
              isPitcher: p.isPitcher,
            }))}
            pitchers={pitchers.map((p) => ({
              id: p.id,
              name: p.name,
              primaryPos: p.primaryPos,
              positions: p.positions,
              isPitcher: p.isPitcher,
            }))}
            initialLineup={refreshed.lineup.map((s) => ({
              playerId: s.playerId,
              battingOrder: s.battingOrder,
              position: s.position,
            }))}
            initialStaff={refreshed.staff.map((s) => ({
              playerId: s.playerId,
              role: s.role,
            }))}
          />
        )}
      </main>
    </div>
  );
}
