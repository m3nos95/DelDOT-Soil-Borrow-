import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import { TradeDesk } from "@/components/TradeDesk";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function TradesPage({
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
        orderBy: { abbreviation: "asc" },
      },
    },
  });
  if (!league) notFound();
  if (league.status !== "season" && league.status !== "drafting") {
    redirect(`/league/${id}`);
  }

  const myTeam = league.teams.find(
    (t) => t.ownerId === session.id && !t.isCpu,
  );
  if (!myTeam) redirect(`/league/${id}`);

  const trades = await prisma.trade.findMany({
    where: { leagueId: id },
    include: {
      assets: { include: { player: true } },
      proposerTeam: true,
      partnerTeam: true,
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const mapTrade = (t: (typeof trades)[number]) => {
    const give = t.assets.filter((a) => a.fromTeamId === t.proposerTeamId);
    const get = t.assets.filter((a) => a.fromTeamId === t.partnerTeamId);
    return {
      id: t.id,
      status: t.status,
      note: t.note,
      proposerTeamId: t.proposerTeamId,
      partnerTeamId: t.partnerTeamId,
      proposerAbbr: t.proposerTeam.abbreviation,
      partnerAbbr: t.partnerTeam.abbreviation,
      giveNames: give.map((a) => a.player.name),
      getNames: get.map((a) => a.player.name),
      iAmPartner: t.partnerTeamId === myTeam.id,
      iAmProposer: t.proposerTeamId === myTeam.id,
    };
  };

  const pending = trades.filter((t) => t.status === "pending").map(mapTrade);
  const recent = trades
    .filter((t) => t.status !== "pending")
    .slice(0, 12)
    .map(mapTrade);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
          Trades
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          Swap with friends or CPU clubs. CPU GMs reject one-sided offers.
        </p>
        <LeagueNav leagueId={id} status={league.status} />
        <TradeDesk
          leagueId={id}
          myTeamId={myTeam.id}
          teams={league.teams.map((t) => ({
            id: t.id,
            name: t.name,
            abbreviation: t.abbreviation,
            isCpu: t.isCpu,
            roster: t.roster.map((r) => ({
              id: r.player.id,
              name: r.player.name,
              primaryPos: r.player.primaryPos,
              salary: r.player.salary,
              careerWAR: r.player.careerWAR,
              isPitcher: r.player.isPitcher,
            })),
          }))}
          pending={pending}
          recent={recent}
        />
      </main>
    </div>
  );
}
