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
    <header className="site-header sticky top-0 z-40">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex items-baseline gap-4">
          <Link
            href="/clubhouse"
            className="font-[family-name:var(--font-display)] text-3xl tracking-[0.08em] transition-colors hover:text-[var(--foul)]"
          >
            HARDBALL
          </Link>
          {leagueName ? (
            <span className="hidden truncate text-sm text-[var(--fog)] sm:inline">
              {leagueName}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-[var(--fog)] sm:inline">
            {user.displayName}
          </span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-[family-name:var(--font-display)] text-sm tracking-[0.12em] uppercase text-[var(--fog)] transition-colors hover:text-[var(--foul)]"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
