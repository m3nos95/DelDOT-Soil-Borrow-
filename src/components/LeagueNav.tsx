import Link from "next/link";

const links = [
  { href: "", label: "Overview" },
  { href: "/draft", label: "Draft" },
  { href: "/team", label: "Lineup" },
  { href: "/standings", label: "Standings" },
];

export function LeagueNav({
  leagueId,
  status,
}: {
  leagueId: string;
  status: string;
}) {
  const visible =
    status === "drafting"
      ? links.filter((l) => l.href !== "/standings")
      : status === "forming"
        ? links.filter((l) => !l.href || l.href === "/draft")
        : links.filter((l) => l.href !== "/draft");

  return (
    <nav className="mb-8 flex flex-wrap gap-2 border-b border-[var(--line)] pb-3">
      {visible.map((link) => (
        <Link
          key={link.href || "overview"}
          href={`/league/${leagueId}${link.href}`}
          className="px-3 py-1.5 text-sm uppercase tracking-[0.14em] text-[var(--fog)] transition hover:text-[var(--foul)]"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
