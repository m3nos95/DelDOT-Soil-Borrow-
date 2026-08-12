import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { ClubhouseActions } from "@/components/ClubhouseActions";
import { DeleteLeagueButton } from "@/components/DeleteLeagueButton";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { dynastyEraById } from "@/lib/environment";
import { formatRecord } from "@/lib/format";

export default async function ClubhousePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const teams = await prisma.team.findMany({
    where: { ownerId: session.id, isCpu: false },
    include: { league: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="page-shell">
      <AppHeader user={session} />
      <main className="mx-auto max-w-3xl px-5 py-12 sm:py-16">
        <header className="mb-12">
          <p className="mb-2 font-[family-name:var(--font-display)] text-sm tracking-[0.2em] uppercase text-[var(--foul)]">
            Welcome back, {session.displayName}
          </p>
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-7xl">
            Clubhouse
          </h1>
          <p className="mt-4 max-w-lg text-lg text-[var(--fog)] leading-relaxed">
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
                const isCommish = team.league.commissionerId === session.id;
                return (
                  <div
                    key={team.id}
                    className="league-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link
                      href={`/league/${team.leagueId}`}
                      className="min-w-0 flex-1"
                    >
                      <div className="font-[family-name:var(--font-display)] text-3xl tracking-wide sm:text-4xl">
                        {team.league.name}
                      </div>
                      <div className="mt-1.5 text-sm text-[var(--fog)]">
                        <span className="text-[var(--chalk)]">
                          {team.abbreviation}
                        </span>
                        {" · "}
                        {era.label}
                        {" · "}
                        <span className="uppercase tracking-[0.12em]">
                          {team.league.status}
                        </span>
                        {team.league.status === "season" ||
                        team.league.status === "complete"
                          ? ` · ${formatRecord(team.wins, team.losses)}`
                          : ""}
                      </div>
                    </Link>
                    {isCommish ? (
                      <DeleteLeagueButton
                        leagueId={team.leagueId}
                        leagueName={team.league.name}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="empty-diamond fade-up">
            <h2>No leagues yet</h2>
            <p className="max-w-md text-[var(--fog)] leading-relaxed">
              Create a dynasty for your friends, or join with an invite code.
            </p>
          </section>
        )}

        <ClubhouseActions hasLeagues={teams.length > 0} />
      </main>
    </div>
  );
}
