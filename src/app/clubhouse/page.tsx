import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ClubhouseActions } from "@/components/ClubhouseActions";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dynastyEraById } from "@/lib/environment";
import { formatRecord } from "@/lib/format";

export default async function ClubhousePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const teams = await prisma.team.findMany({
    where: { ownerId: session.id },
    include: { league: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <AppHeader user={session} />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
            Clubhouse
          </h1>
          <p className="mt-3 max-w-lg text-[var(--fog)] leading-relaxed">
            Your private leagues. Pick an era, claim a city slot, invite the crew.
          </p>
        </header>

        {teams.length > 0 ? (
          <section>
            <h2 className="mb-2 font-[family-name:var(--font-display)] text-sm tracking-[0.18em] text-[var(--foul)] uppercase">
              Your leagues
            </h2>
            <div className="border-t border-[var(--line)]">
              {teams.map((team) => {
                const era = dynastyEraById(team.league.era);
                return (
                  <Link
                    key={team.id}
                    href={`/league/${team.leagueId}`}
                    className="league-row"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <div>
                        <div className="font-[family-name:var(--font-display)] text-2xl tracking-wide sm:text-3xl">
                          {team.league.name}
                        </div>
                        <div className="mt-1 text-sm text-[var(--fog)]">
                          {team.abbreviation} · {era.label}
                        </div>
                      </div>
                      <div className="font-[family-name:var(--font-display)] text-sm tracking-[0.12em] uppercase text-[var(--fog)]">
                        {team.league.status}
                        {team.league.status === "season" ||
                        team.league.status === "complete"
                          ? ` · ${formatRecord(team.wins, team.losses)}`
                          : ""}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        ) : (
          <p className="border-t border-[var(--line)] pt-6 text-[var(--fog)]">
            No leagues yet — create one or join with an invite code.
          </p>
        )}

        <ClubhouseActions hasLeagues={teams.length > 0} />
      </main>
    </div>
  );
}
