import { redirect, notFound } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { LeagueNav } from "@/components/LeagueNav";
import {
  awardLabel,
  getLeagueAwards,
  type AwardKind,
  GG_POSITIONS,
  SS_POSITIONS,
} from "@/lib/awards";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type AwardRow = Awaited<ReturnType<typeof getLeagueAwards>>["awards"][number];

function groupByCircuit(awards: AwardRow[]) {
  const map = new Map<string, AwardRow[]>();
  for (const a of awards) {
    const list = map.get(a.circuit) ?? [];
    list.push(a);
    map.set(a.circuit, list);
  }
  return [...map.entries()].sort(([a], [b]) => {
    const order = { AL: 0, NL: 1, LEAGUE: 2 } as Record<string, number>;
    return (order[a] ?? 9) - (order[b] ?? 9);
  });
}

function WinnerCard({
  title,
  award,
}: {
  title: string;
  award: AwardRow | undefined;
}) {
  return (
    <article className="award-card">
      <p className="award-kind">{title}</p>
      {award ? (
        <>
          <h3 className="award-name">{award.player.name}</h3>
          <p className="award-meta">
            <span className="stat-mono">{award.team.abbreviation}</span>
            <span>{award.team.name}</span>
          </p>
          <p className="award-note">{award.note}</p>
        </>
      ) : (
        <p className="award-empty">No qualifier yet</p>
      )}
    </article>
  );
}

function PositionGrid({
  kind,
  positions,
  awards,
}: {
  kind: AwardKind;
  positions: readonly string[];
  awards: AwardRow[];
}) {
  const byPos = Object.fromEntries(
    awards
      .filter((a) => a.award === kind)
      .map((a) => [a.position, a]),
  );
  return (
    <div className="award-pos-grid">
      {positions.map((pos) => {
        const a = byPos[pos];
        return (
          <div key={pos} className="award-pos">
            <span className="award-pos-label">{pos}</span>
            {a ? (
              <>
                <span className="award-pos-name">{a.player.name}</span>
                <span className="award-pos-note">{a.note}</span>
              </>
            ) : (
              <span className="award-pos-note">—</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default async function AwardsPage({
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

  const member = league.teams.find(
    (t) => t.ownerId === session.id && !t.isCpu,
  );
  if (!member && league.commissionerId !== session.id) redirect("/clubhouse");

  const { awards, live } = await getLeagueAwards(id);
  const circuits = groupByCircuit(awards);

  return (
    <div className="page-shell">
      <AppHeader user={session} leagueName={league.name} />
      <main className="mx-auto max-w-6xl px-5 py-8 sm:py-10">
        <h1 className="mb-1 font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
          Awards
        </h1>
        <p className="mb-6 text-[var(--fog)]">
          {live
            ? "Live award race from season lines so far — finalizes when the schedule ends."
            : "Final season hardware from counting stats, gloves, and team context."}
        </p>
        <LeagueNav leagueId={id} status={league.status} />

        {circuits.length === 0 ? (
          <div className="empty-diamond">
            <h2>No hardware yet</h2>
            <p className="text-[var(--fog)]">
              Sim a few more games so hitters and pitchers clear qualifying
              thresholds.
            </p>
          </div>
        ) : (
          circuits.map(([circuit, rows]) => {
            const mvp = rows.find((a) => a.award === "mvp");
            const cy = rows.find((a) => a.award === "cy_young");
            const heading =
              circuit === "LEAGUE"
                ? live
                  ? "League leaders"
                  : "League awards"
                : `${circuit} ${live ? "race" : "awards"}`;
            return (
              <section key={circuit} className="mb-14">
                <h2 className="mb-5 font-[family-name:var(--font-display)] text-3xl tracking-wide text-[var(--foul)]">
                  {heading}
                </h2>

                <div className="mb-10 grid gap-6 sm:grid-cols-2">
                  <WinnerCard title={awardLabel("mvp")} award={mvp} />
                  <WinnerCard title={awardLabel("cy_young")} award={cy} />
                </div>

                <div className="mb-8">
                  <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-wide">
                    Silver Slugger
                  </h3>
                  <p className="mb-4 text-sm text-[var(--fog)]">
                    Best bat at each position (lineup slot, else primary).
                  </p>
                  <PositionGrid
                    kind="silver_slugger"
                    positions={SS_POSITIONS}
                    awards={rows}
                  />
                </div>

                <div>
                  <h3 className="mb-3 font-[family-name:var(--font-display)] text-2xl tracking-wide">
                    Gold Glove
                  </h3>
                  <p className="mb-4 text-sm text-[var(--fog)]">
                    Glove score from defensive rating and season workload — career
                    Gold Gloves are a soft prior, not a lock.
                  </p>
                  <PositionGrid
                    kind="gold_glove"
                    positions={GG_POSITIONS}
                    awards={rows}
                  />
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}
