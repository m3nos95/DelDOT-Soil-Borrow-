"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  {
    href: "",
    label: "Overview",
    statuses: ["drafting", "season", "complete", "forming"],
  },
  { href: "/draft", label: "Draft", statuses: ["drafting"] },
  {
    href: "/live",
    label: "Live",
    statuses: ["season", "complete"],
  },
  {
    href: "/free-agency",
    label: "Free agents",
    statuses: ["season"],
  },
  { href: "/trades", label: "Trades", statuses: ["season", "drafting"] },
  { href: "/team", label: "Lineup", statuses: ["drafting", "season", "complete"] },
  {
    href: "/standings",
    label: "Standings",
    statuses: ["season", "complete"],
  },
  {
    href: "/stats",
    label: "Stats",
    statuses: ["season", "complete"],
  },
  {
    href: "/awards",
    label: "Awards",
    statuses: ["season", "complete"],
  },
] as const;

export function LeagueNav({
  leagueId,
  status,
}: {
  leagueId: string;
  status: string;
}) {
  const pathname = usePathname();
  const base = `/league/${leagueId}`;
  const items = LINKS.filter((l) =>
    (l.statuses as readonly string[]).includes(status),
  );

  return (
    <nav className="league-tabs" aria-label="League">
      {items.map((item) => {
        const href = `${base}${item.href}`;
        const active =
          item.href === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={item.href || "overview"}
            href={href}
            className="league-tab"
            data-active={active}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
