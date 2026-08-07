import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { DraftBoard } from "@/components/DraftBoard";
import { LeagueNav } from "@/components/LeagueNav";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  dynastyEraById,
  dynastyEraPlayerWhere,
} from "@/lib/environment";

const PAGE_SIZE = 75;

function draftHref(
  leagueId: string,
  opts: { tab?: string; q?: string; page?: number },
) {
  const params = new URLSearchParams();
  if (opts.tab && opts.tab !== "hitters") params.set("tab", opts.tab);
  if (opts.q) params.set("q", opts.q);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  const qs = params.toString();
  return `/league/${leagueId}/draft${qs ? `?${qs}` : ""}`;
}

export default async function DraftPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ q?: string; tab?: string; page?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const session = await getSession();
  if (!session) redirect("/login");

  const league = await prisma.league.findUnique({
    where: { id },
    include: {
      teams: {
        include: {
          owner: true,
          roster: { include: { player: true } },
        },
      },
    },
  });
  if (!league) notFound();

  const myTeam = league.teams.find((t) => t.ownerId === session.id);
  if (!myTeam) redirect("/clubhouse");

  const tab = sp.tab === "pitchers" || sp.tab === "roster" ? sp.tab : "hitters";
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const ownerByPlayer = new Map<string, string>();
  for (const team of league.teams) {
    for (const spot of team.roster) {
      ownerByPlayer.set(spot.playerId, team.abbreviation);
    }
  }
  const myRosterSet = new Set(myTeam.roster.map((r) => r.playerId));
  const payroll = myTeam.roster.reduce((s, r) => s + r.player.salary, 0);
  const era = dynastyEraById(league.era);
  const eraWhere = dynastyEraPlayerWhere(era);
  const poolCount = await prisma.player.count({ where: eraWhere });

  let players: {
    id: string;
    name: string;
    yearFrom: number;
    yearTo: number;
    primaryPos: string;
    salary: number;
    isPitcher: boolean;
    description: string;
    careerWAR: number;
  }[] = [];
  let total = 0;

  if (tab === "roster") {
    const rosterPlayers = myTeam.roster
      .map((r) => r.player)
      .sort((a, b) => b.salary - a.salary || a.name.localeCompare(b.name));
    total = rosterPlayers.length;
    players = rosterPlayers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  } else {
    const where = {
      isPitcher: tab === "pitchers",
      ...eraWhere,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { primaryPos: { contains: q.toUpperCase() } },
              { description: { contains: q } },
            ],
          }
        : {}),
    };
    total = await prisma.player.count({ where });
    players = await prisma.player.findMany({
      where,
      orderBy: [{ salary: "desc" }, { careerWAR: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide">
          Draft
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          <span className="text-[var(--foul)]">{era.label}</span>
          {era.id !== "open" ? ` · ${era.yearFrom}–${era.yearTo}` : ""}
          {" · "}
          {poolCount.toLocaleString()} career cards
        </p>
        <LeagueNav leagueId={id} status={league.status} />
        <DraftBoard
          leagueId={id}
          salaryCap={league.salaryCap}
          payroll={payroll}
          draftReady={myTeam.draftReady}
          locked={league.status !== "drafting"}
          tab={tab}
          q={q}
          page={page}
          total={total}
          players={players.map((p) => ({
            id: p.id,
            name: p.name,
            yearFrom: p.yearFrom,
            yearTo: p.yearTo,
            primaryPos: p.primaryPos,
            salary: p.salary,
            isPitcher: p.isPitcher,
            description: p.description,
            careerWAR: p.careerWAR,
            takenBy: ownerByPlayer.get(p.id) ?? null,
            onMyRoster: myRosterSet.has(p.id),
          }))}
        />
        {totalPages > 1 ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-[var(--fog)]">
            <span>
              Page {page} of {totalPages} · {total.toLocaleString()} matches
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={draftHref(id, { tab, q, page: page - 1 })}
                  className="btn btn-ghost !py-1.5 !px-3 !text-xs"
                >
                  Prev
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={draftHref(id, { tab, q, page: page + 1 })}
                  className="btn btn-ghost !py-1.5 !px-3 !text-xs"
                >
                  Next
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}
