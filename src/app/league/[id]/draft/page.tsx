import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DraftBoard } from "@/components/DraftBoard";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function DraftPage({
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
        include: {
          owner: true,
          roster: true,
        },
      },
    },
  });
  if (!league) notFound();

  const myTeam = league.teams.find((t) => t.ownerId === session.id);
  if (!myTeam) redirect("/clubhouse");

  const players = await prisma.player.findMany({
    orderBy: [{ salary: "desc" }, { name: "asc" }],
  });

  const ownerByPlayer = new Map<string, string>();
  const myRoster = new Set(myTeam.roster.map((r) => r.playerId));
  for (const team of league.teams) {
    for (const spot of team.roster) {
      ownerByPlayer.set(spot.playerId, team.abbreviation);
    }
  }

  const payroll = players
    .filter((p) => myRoster.has(p.id))
    .reduce((s, p) => s + p.salary, 0);

  return (
    <div className="min-h-screen">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide">
          Draft board
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Pick your legends. Same player can&apos;t be on two teams.
        </p>
        <LeagueNav leagueId={id} status={league.status} />
        <DraftBoard
          leagueId={id}
          salaryCap={league.salaryCap}
          payroll={payroll}
          draftReady={myTeam.draftReady}
          locked={league.status !== "drafting"}
          players={players.map((p) => ({
            id: p.id,
            name: p.name,
            yearFrom: p.yearFrom,
            yearTo: p.yearTo,
            primaryPos: p.primaryPos,
            salary: p.salary,
            isPitcher: p.isPitcher,
            description: p.description,
            takenBy: ownerByPlayer.get(p.id) ?? null,
            onMyRoster: myRoster.has(p.id),
          }))}
        />
      </main>
    </div>
  );
}
