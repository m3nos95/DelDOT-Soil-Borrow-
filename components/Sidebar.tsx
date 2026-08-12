"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  FileUp,
  FolderKanban,
  History,
  LayoutDashboard,
  Settings,
  Sparkles,
} from "lucide-react";
import { DelDotSeal } from "./DelDotSeal";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload", icon: FileUp },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/analysis", label: "Analysis Results", icon: Sparkles },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/history", label: "History", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-[232px] shrink-0 flex-col bg-navy-900 text-white">
      <div className="flex items-center gap-3 px-5 pb-4 pt-6">
        <DelDotSeal className="h-11 w-11" />
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
            DelDOT
          </div>
          <div className="text-sm font-semibold leading-tight">Grant Matching</div>
        </div>
      </div>
      <nav className="mt-2 flex-1 space-y-0.5 px-3">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                active ? "bg-white/12 font-semibold text-white" : "text-white/75 hover:bg-white/8 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="m-3 rounded-lg border border-white/15 bg-white/8 p-3 text-[11px] leading-relaxed text-white/80">
        <div className="mb-1 font-semibold uppercase tracking-wide text-deldot-gold">Pilot Mode</div>
        This is a Phase 1 Pilot. Results should be reviewed and validated by the Grant Manager.
      </div>
    </aside>
  );
}
