import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function AppHeader({
  user,
  leagueName,
}: {
  user: SessionUser;
  leagueName?: string;
}) {
  return (
    <header className="border-b border-[var(--line)] bg-black/20 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-6">
          <Link href="/clubhouse" className="group">
            <div className="font-[family-name:var(--font-display)] text-3xl tracking-[0.06em] text-[var(--chalk)]">
              HARDBALL
            </div>
            <div className="text-[10px] uppercase tracking-[0.28em] text-[var(--fog)] group-hover:text-[var(--foul)] transition-colors">
              Private Diamond Club
            </div>
          </Link>
          {leagueName ? (
            <div className="hidden sm:block border-l border-[var(--line)] pl-6 text-sm text-[var(--fog)]">
              {leagueName}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--fog)] sm:inline">
            {user.displayName}
          </span>
          <form action={logoutAction}>
            <button type="submit" className="btn btn-ghost !py-2 !px-3 !text-sm">
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
