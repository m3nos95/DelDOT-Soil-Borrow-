import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { FreeAgencyBoard } from "@/components/FreeAgencyBoard";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  dynastyEraById,
  dynastyEraPlayerWhere,
} from "@/lib/environment";
import { draftedPlayerIds } from "@/lib/league";

export default async function FreeAgencyPage({
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
        include: { roster: { include: { player: true } } },
      },
    },
  });
  if (!league) notFound();
  if (league.status !== "season") redirect(`/league/${id}`);

  const myTeam = league.teams.find(
    (t) => t.ownerId === session.id && !t.isCpu,
  );
  if (!myTeam && league.commissionerId !== session.id) redirect("/clubhouse");
  if (!myTeam) redirect(`/league/${id}`);

  const era = dynastyEraById(league.era);
  const taken = await draftedPlayerIds(id);
  const pool = await prisma.player.findMany({
    where: dynastyEraPlayerWhere(era),
    orderBy: [{ careerWAR: "desc" }, { salary: "desc" }],
    take: 500,
  });
  const freeAgents = pool.filter((p) => !taken.has(p.id));
  const payroll = myTeam.roster.reduce((s, r) => s + r.player.salary, 0);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
          Free agents
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Sign undrafted career cards under the cap. Cut to make room.
        </p>
        <LeagueNav leagueId={id} status={league.status} />
        <FreeAgencyBoard
          leagueId={id}
          salaryCap={league.salaryCap}
          payroll={payroll}
          freeAgents={freeAgents.map((p) => ({
            id: p.id,
            name: p.name,
            primaryPos: p.primaryPos,
            yearFrom: p.yearFrom,
            yearTo: p.yearTo,
            salary: p.salary,
            careerWAR: p.careerWAR,
            description: p.description,
            isPitcher: p.isPitcher,
          }))}
          myRoster={myTeam.roster.map((r) => ({
            id: r.player.id,
            name: r.player.name,
            primaryPos: r.player.primaryPos,
            yearFrom: r.player.yearFrom,
            yearTo: r.player.yearTo,
            salary: r.player.salary,
            careerWAR: r.player.careerWAR,
            description: r.player.description,
            isPitcher: r.player.isPitcher,
          }))}
        />
      </main>
    </div>
  );
}
