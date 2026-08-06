import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { CreateLeagueForm, JoinLeagueForm } from "@/components/LeagueForms";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
    <div className="min-h-screen">
      <AppHeader user={session} />
      <main className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-display)] text-5xl tracking-wide sm:text-6xl">
            Clubhouse
          </h1>
          <p className="mt-2 max-w-xl text-[var(--fog)]">
            Create a private league and share the invite code, or join one your
            friends already started.
          </p>
        </div>

        {teams.length > 0 ? (
          <section className="mb-12">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-2xl tracking-wide text-[var(--foul)]">
              Your leagues
            </h2>
            <div className="grid gap-3">
              {teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/league/${team.leagueId}`}
                  className="scoreboard flex flex-col gap-2 px-5 py-4 transition hover:border-[rgba(230,195,92,0.35)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
                      {team.league.name}
                    </div>
                    <div className="text-sm text-[var(--fog)]">
                      {team.name} ({team.abbreviation}) · {team.park}
                    </div>
                  </div>
                  <div className="text-sm uppercase tracking-[0.15em] text-[var(--fog)]">
                    {team.league.status}
                    {team.league.status === "season" ||
                    team.league.status === "complete"
                      ? ` · ${formatRecord(team.wins, team.losses)}`
                      : ""}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="scoreboard p-6">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
              Create a league
            </h2>
            <CreateLeagueForm />
          </section>
          <section className="scoreboard p-6">
            <h2 className="mb-4 font-[family-name:var(--font-display)] text-3xl tracking-wide">
              Join with code
            </h2>
            <JoinLeagueForm />
          </section>
        </div>
      </main>
    </div>
  );
}
